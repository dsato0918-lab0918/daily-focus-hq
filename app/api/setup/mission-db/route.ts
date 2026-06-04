import { NextResponse } from "next/server";

const NOTION_TOKEN   = process.env.NOTION_TOKEN ?? "";
const PROJECTS_DB_ID = process.env.NOTION_PROJECTS_DB_ID ?? "178509ee0e144c0982dfbf1c74f60c3b";

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
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

export async function GET() {
  try {
    // 既存DBの親ページを取得
    const existingDb = await notionFetch(`/databases/${PROJECTS_DB_ID}`);
    const parent = existingDb.parent;

    // ミッションDBを作成
    const newDb = await notionFetch("/databases", "POST", {
      parent,
      icon: { type: "emoji", emoji: "🎯" },
      title: [{ type: "text", text: { content: "ミッション" } }],
      properties: {
        "日付":     { title: {} },
        "タスクIDs": { rich_text: {} },
      },
    });

    return NextResponse.json({
      success: true,
      message: "ミッションDBを作成しました！",
      database_id: newDb.id,
      next_step: `Vercelの環境変数に NOTION_MISSION_DB_ID = ${newDb.id} を追加してください`,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
