import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
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

    const systemPrompt = `あなたは建設・設計会社向けのタスク管理ツール「SUGAR Task」のAIアシスタントです。
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

    // OpenAI互換フォーマットに変換（systemメッセージをネイティブサポート）
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: { role: string; text: string }) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      })),
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: chatMessages,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Groq API error:", errBody);
      return NextResponse.json(
        { error: `AI接続エラーが発生しました（${res.status}）。` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "応答を取得できませんでした。";
    return NextResponse.json({ text });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("AI chat error:", errMsg);
    return NextResponse.json(
      { error: "AIとの通信中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
