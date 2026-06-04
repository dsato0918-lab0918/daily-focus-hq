import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const LINE_CHANNEL_SECRET       = process.env.LINE_CHANNEL_SECRET ?? "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
const NOTION_TOKEN  = process.env.NOTION_TOKEN ?? "";
const GROQ_API_KEY  = process.env.GROQ_API_KEY ?? "";
const TASKS_DB_ID    = process.env.NOTION_TASKS_DB_ID    ?? "578bac9d879142dd95a9629d9cbf7deb";
const PROJECTS_DB_ID = process.env.NOTION_PROJECTS_DB_ID ?? "178509ee0e144c0982dfbf1c74f60c3b";

// ── LINE 署名検証 ───────────────────────────────────────────────
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// ── LINE 返信 ───────────────────────────────────────────────────
async function replyMessage(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

// ── Groq でタスク情報を自然言語解析 ────────────────────────────
async function parseWithGroq(
  text: string,
  today: string
): Promise<{ title: string; due_date: string | null; urgent: boolean }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `あなたはタスク抽出AIです。今日の日付は ${today} です。
ユーザーのメッセージからタスク情報を抽出し、必ず以下のJSON形式のみで返してください（他のテキストは一切含めない）:
{"title":"タスク名","due_date":"YYYY-MM-DD or null","urgent":false}
- title: タスク名（日本語）
- due_date: 日付が含まれていれば YYYY-MM-DD 形式。「明日」「来週」等も変換。なければ null
- urgent: 急ぎ/至急/ASAP/今すぐ 等が含まれていれば true`,
          },
          { role: "user", content: text },
        ],
        temperature: 0,
        max_tokens: 100,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { title: text, due_date: null, urgent: false };
  }
}

// ── Notion: アクティブプロジェクト一覧取得 ─────────────────────
async function getActiveProjects(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(
    `https://api.notion.com/v1/databases/${PROJECTS_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "アーカイブ", checkbox: { equals: false } },
        page_size: 50,
      }),
    }
  );
  const data = await res.json();
  return (data.results ?? []).map((page: { id: string; properties: Record<string, { title?: Array<{ plain_text: string }> }> }) => ({
    id: page.id,
    name: page.properties["名前"]?.title?.[0]?.plain_text ?? "",
  }));
}

// ── Notion: タスク作成 ─────────────────────────────────────────
async function createNotionTask(
  title: string,
  projId: string,
  due: string | null,
  urgent: boolean
) {
  const properties: Record<string, unknown> = {
    "タイトル":    { title: [{ text: { content: title } }] },
    "プロジェクト": { relation: [{ id: projId }] },
    "完了":        { checkbox: false },
    "急ぎ":        { checkbox: urgent },
    "メモ":        { rich_text: [{ text: { content: "" } }] },
  };
  // 期日は rich_text 型（date型ではない）
  if (due) properties["期日"] = { rich_text: [{ text: { content: due } }] };

  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: TASKS_DB_ID },
      properties,
    }),
  });
}

// ── Webhook ハンドラー ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  // 署名検証（シークレット未設定時はスキップ）
  if (LINE_CHANNEL_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: { events?: Array<{
    type: string;
    replyToken: string;
    message?: { type: string; text: string };
  }> };
  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  for (const event of data.events ?? []) {
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const text = event.message.text.trim();
    const replyToken = event.replyToken;

    try {
      // AI でタスク情報を解析
      const parsed = await parseWithGroq(text, today);

      if (!parsed.title?.trim()) {
        await replyMessage(replyToken, "タスク名が読み取れませんでした。もう一度送ってください。");
        continue;
      }

      // アクティブなプロジェクトを取得
      const projects = await getActiveProjects();
      if (projects.length === 0) {
        await replyMessage(replyToken, "プロジェクトが見つかりませんでした。\nSUGAR Taskでプロジェクトを作成してください。");
        continue;
      }

      // 「シングルタスク」を常にデフォルト。メッセージに他PJ名があれば優先
      const singleTask = projects.find((p) => p.name === "シングルタスク");
      let target = singleTask ?? projects[0];
      if (!singleTask) {
        for (const proj of projects) {
          if (proj.name && text.includes(proj.name)) { target = proj; break; }
        }
      }

      // Notion にタスク作成
      await createNotionTask(parsed.title.trim(), target.id, parsed.due_date, parsed.urgent ?? false);

      // 返信メッセージ
      const dueStr    = parsed.due_date
        ? `\n📅 期限: ${parsed.due_date.replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3")}`
        : "";
      const urgentStr = parsed.urgent ? "\n🔴 急ぎ" : "";

      await replyMessage(
        replyToken,
        `✅ タスクを追加しました！\n\n📌 ${parsed.title.trim()}${dueStr}${urgentStr}\n📁 ${target.name}`
      );
    } catch (err) {
      console.error("LINE webhook error:", err);
      await replyMessage(replyToken, "エラーが発生しました。もう一度試してください。");
    }
  }

  return NextResponse.json({ ok: true });
}
