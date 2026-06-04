import { NextResponse } from "next/server";

const NOTION_TOKEN  = process.env.NOTION_TOKEN ?? "";
const MISSION_DB_ID = process.env.NOTION_MISSION_DB_ID ?? "";

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
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

export async function GET() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  // Step1: 環境変数確認
  if (!MISSION_DB_ID) {
    return NextResponse.json({ step: "env_check", error: "NOTION_MISSION_DB_ID が未設定です" });
  }

  // Step2: DBにアクセスできるか
  const dbCheck = await notionFetch(`/databases/${MISSION_DB_ID}`);
  if (!dbCheck.ok) {
    return NextResponse.json({ step: "db_access", error: "DBにアクセスできません", detail: dbCheck.data });
  }

  // Step3: 今日のレコードを検索
  const queryRes = await notionFetch(`/databases/${MISSION_DB_ID}/query`, "POST", {
    filter: { property: "日付", title: { equals: today } },
    page_size: 1,
  });

  // Step4: テスト書き込み
  const testIds = ["test-id-1", "test-id-2"];
  const existing = queryRes.data?.results?.[0];
  let writeRes;
  if (existing) {
    writeRes = await notionFetch(`/pages/${existing.id}`, "PATCH", {
      properties: { "タスクIDs": { rich_text: [{ text: { content: testIds.join(",") } }] } },
    });
  } else {
    writeRes = await notionFetch("/pages", "POST", {
      parent: { database_id: MISSION_DB_ID },
      properties: {
        "日付":     { title: [{ text: { content: today } }] },
        "タスクIDs": { rich_text: [{ text: { content: testIds.join(",") } }] },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    env_var_set: true,
    db_accessible: true,
    today,
    existing_record: !!existing,
    existing_taskIds: existing ? existing.properties["タスクIDs"]?.rich_text?.[0]?.plain_text : null,
    write_ok: writeRes.ok,
    write_status: writeRes.status,
  });
}
