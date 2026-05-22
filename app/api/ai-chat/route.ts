import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバー設定エラー: APIキーが設定されていません。" },
      { status: 500 }
    );
  }

  try {
    const { messages, tasks, projects, domains } = await req.json();

    const taskSummary = tasks
      .map((t: { title: string; done: boolean; urgent: boolean; due: string; memo: string; projId: string }) => {
        const proj = projects.find((p: { id: string; name: string; domain: string }) => p.id === t.projId);
        const dom = domains.find((d: { id: string; label: string }) => d.id === proj?.domain);
        return `- [${t.done ? "完了" : "未完了"}]${t.urgent ? "【急ぎ】" : ""} ${t.title}（期限: ${t.due || "未設定"}、プロジェクト: ${proj?.name || "不明"}、分野: ${dom?.label || "不明"}）${t.memo ? `\n  メモ: ${t.memo}` : ""}`;
      })
      .join("\n");

    const projectSummary = projects
      .map((p: { name: string; status: string; domain: string }) => {
        const dom = domains.find((d: { id: string; label: string }) => d.id === p.domain);
        const statusLabel = p.status === "g" ? "順調" : p.status === "a" ? "注意" : "遅延";
        return `- ${p.name}（分野: ${dom?.label || "不明"}、ステータス: ${statusLabel}）`;
      })
      .join("\n");

    const systemPrompt = `あなたは建設・設計会社向けのタスク管理ツール「Daily Focus HQ」のAIアシスタントです。
ユーザーの現在のタスクとプロジェクトの状況を把握した上で、業務の優先順位付けや進め方についてアドバイスをしてください。

## 現在のプロジェクト一覧
${projectSummary || "（プロジェクトなし）"}

## 現在のタスク一覧
${taskSummary || "（タスクなし）"}

## 回答ルール
- 日本語で簡潔に答えてください（200字以内を目安）
- 具体的なタスク名やプロジェクト名を使って回答してください
- 優先度・緊急度・進捗に基づいた実践的なアドバイスをしてください
- 操作方法の質問にも答えてください`;

    // 会話履歴を構築（先頭のAIメッセージを除去）
    let historyMsgs = messages.slice(0, -1);
    while (historyMsgs.length > 0 && historyMsgs[0].role !== "user") {
      historyMsgs = historyMsgs.slice(1);
    }
    const contents = [
      ...historyMsgs.map((msg: { role: string; text: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      })),
      { role: "user", parts: [{ text: messages[messages.length - 1].text }] },
    ];

    // SDK を使わず v1 REST API を直接呼び出す
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gemini API error:", errBody);
      return NextResponse.json(
        { error: `[DEBUG] ${res.status} ${errBody.slice(0, 300)}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "応答を取得できませんでした。";
    return NextResponse.json({ text });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("AI chat error:", errMsg);
    return NextResponse.json(
      { error: `[DEBUG] ${errMsg}` },
      { status: 500 }
    );
  }
}
