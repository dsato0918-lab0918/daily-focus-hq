import { NextRequest, NextResponse } from "next/server";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? "";

export async function POST(req: NextRequest) {
  if (!SLACK_WEBHOOK_URL) {
    return NextResponse.json({ ok: false, error: "SLACK_WEBHOOK_URL が未設定です" }, { status: 500 });
  }

  const { message } = await req.json() as { message: string };
  if (!message) return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });

  const lines = message.split("\n").map((line) =>
    line.startsWith("【") ? `*${line}*` : line
  ).join("\n");

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "📋 タスク依頼が届きました", emoji: true },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: lines },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_SUGAR Task より · ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}_`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Slack error:", res.status, text);
    return NextResponse.json({ ok: false, error: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
