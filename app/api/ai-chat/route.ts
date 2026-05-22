import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages, tasks, projects, domains } = await req.json();

    // タスク・プロジェクトの状況をテキストにまとめる
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

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });

    // 会話履歴を Gemini 形式に変換（最後のユーザーメッセージを除く）
    // Gemini は履歴がユーザーメッセージから始まる必要があるため、先頭のAIメッセージを除去
    let historyMsgs = messages.slice(0, -1);
    while (historyMsgs.length > 0 && historyMsgs[0].role !== "user") {
      historyMsgs = historyMsgs.slice(1);
    }
    const history = historyMsgs.map((msg: { role: string; text: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].text;
    const result = await chat.sendMessage(lastMessage);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "AIの応答に失敗しました。しばらく待ってから再試行してください。" },
      { status: 500 }
    );
  }
}
