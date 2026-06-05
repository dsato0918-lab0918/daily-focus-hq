import { NextRequest, NextResponse } from "next/server";

const NOTION_TOKEN   = process.env.NOTION_TOKEN ?? "";
const MISSION_DB_ID  = process.env.NOTION_MISSION_DB_ID ?? "";

async function notionFetch(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
  return res.json();
}

/** 今日のミッションを取得 */
export async function GET(req: NextRequest) {
  if (!MISSION_DB_ID) return NextResponse.json({ taskIds: [] });

  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!date) return NextResponse.json({ taskIds: [] });

  try {
    const res = await notionFetch(`/databases/${MISSION_DB_ID}/query`, "POST", {
      filter: { property: "日付", title: { equals: date } },
      page_size: 1,
    });
    const page = res.results?.[0];
    if (!page) return NextResponse.json({ taskIds: [] });

    const raw = page.properties["タスクIDs"]?.rich_text?.[0]?.plain_text ?? "";
    const [missionPart, bonusPart] = raw.split("||");
    const taskIds  = missionPart ? missionPart.split(",").filter(Boolean) : [];
    const bonusIds = bonusPart   ? bonusPart.split(",").filter(Boolean)   : [];
    return NextResponse.json({ taskIds, bonusIds });
  } catch (e) {
    console.error("mission GET error:", e);
    return NextResponse.json({ taskIds: [] });
  }
}

/** 今日のミッションを保存（upsert） */
export async function POST(req: NextRequest) {
  if (!MISSION_DB_ID) return NextResponse.json({ ok: false, reason: "no db" });

  const { date, taskIds, bonusIds = [] } = await req.json() as { date: string; taskIds: string[]; bonusIds?: string[] };
  if (!date) return NextResponse.json({ ok: false });

  const idsText = bonusIds.length > 0
    ? `${taskIds.join(",")}||${bonusIds.join(",")}`
    : taskIds.join(",");

  try {
    // 既存レコードを検索
    const res = await notionFetch(`/databases/${MISSION_DB_ID}/query`, "POST", {
      filter: { property: "日付", title: { equals: date } },
      page_size: 1,
    });
    const existing = res.results?.[0];

    if (existing) {
      // 更新
      await notionFetch(`/pages/${existing.id}`, "PATCH", {
        properties: {
          "タスクIDs": { rich_text: [{ text: { content: idsText } }] },
        },
      });
    } else {
      // 新規作成
      await notionFetch("/pages", "POST", {
        parent: { database_id: MISSION_DB_ID },
        properties: {
          "日付":     { title: [{ text: { content: date } }] },
          "タスクIDs": { rich_text: [{ text: { content: idsText } }] },
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("mission POST error:", e);
    return NextResponse.json({ ok: false });
  }
}
