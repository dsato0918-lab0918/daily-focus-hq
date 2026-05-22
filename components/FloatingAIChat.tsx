"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  text: string;
}

const MOCK_REPLIES = [
  "タスクの優先度を整理するには、まず期限が近いものと「急ぎ」フラグのついたものを確認しましょう。今日のフォーカスセクションでAIが自動的にトップ3を提案しています。",
  "プロジェクトの進捗管理には、各プロジェクトのステータスドット（緑・黄・赤）を活用できます。プロジェクト名にホバーするとクリックでステータスを変更できます。",
  "新しいタスクを追加するには、タスク一覧の下にある「＋タスクを追加」ボタンをクリックしてください。プロジェクト・期限・急ぎフラグも一緒に設定できます。",
  "大分野を横断してタスクを確認したい場合は、左側の「全体俯瞰」を選択すると、すべての大分野のタスクをまとめて見ることができます。",
  "タスクの詳細を編集するには、タスクをクリックして右側の詳細ペインを開いてください。タイトル・メモ・期限・急ぎフラグを直接編集できます。",
  "完了したタスクを表示するには、タスク一覧の「完了済み」トグルをクリックしてください。目のアイコンで表示/非表示を切り替えられます。",
  "大分野やプロジェクトの名称を変更するには、項目にホバーして鉛筆アイコンをクリックするとインライン編集できます。",
  "タスクの並び順は「登録順・期限順・急ぎ優先・未完了優先」の4種類から選べます。タスク一覧上部のソートバーで切り替えてください。",
];

let replyIndex = 0;
function nextReply() {
  const reply = MOCK_REPLIES[replyIndex % MOCK_REPLIES.length];
  replyIndex++;
  return reply;
}

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // パネルを開いたとき最初の挨拶を表示
  useEffect(() => {
    if (open && messages.length === 0) {
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        setMessages([{
          role: "ai",
          text: "こんにちは！Daily Focus HQ のAIアシスタントです。\nタスク管理・プロジェクト・操作方法など、何でもお気軽にご相談ください。",
        }]);
      }, 700);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = () => {
    if (!input.trim() || thinking) return;
    const userMsg: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages((prev) => [...prev, { role: "ai", text: nextReply() }]);
    }, 1200);
  };

  return (
    <div style={s.wrapper}>

      {/* ── チャットパネル ── */}
      {open && (
        <div style={s.panel}>
          {/* ヘッダー */}
          <div style={s.panelHeader}>
            <div style={s.headerLeft}>
              <span style={s.aiAvatar}>
                <i className="ti ti-sparkles" style={{ fontSize: 15 }} aria-hidden="true" />
              </span>
              <div>
                <div style={s.panelTitle}>AI アシスタント</div>
                <div style={s.poweredBy}>Powered by Gemini</div>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)} title="閉じる">
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>

          {/* メッセージ一覧 */}
          <div style={s.messageList}>
            {/* 初回ローディング */}
            {thinking && messages.length === 0 && (
              <div style={s.aiRow}>
                <div style={s.aiLabel}><i className="ti ti-sparkles" style={{ fontSize: 10 }} /> AI</div>
                <div style={s.aiBubble}>
                  <span style={s.dot1} /><span style={s.dot2} /><span style={s.dot3} />
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}
              >
                {msg.role === "ai" && (
                  <div style={s.aiLabel}>
                    <i className="ti ti-sparkles" style={{ fontSize: 10 }} /> AI
                  </div>
                )}
                <div style={msg.role === "user" ? s.userBubble : s.aiBubble}>
                  {msg.text.split("\n").map((line, j) => (
                    <span key={j}>{line}{j < msg.text.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* 返答中ローディング */}
            {thinking && messages.length > 0 && (
              <div style={s.aiRow}>
                <div style={s.aiLabel}><i className="ti ti-sparkles" style={{ fontSize: 10 }} /> AI</div>
                <div style={s.aiBubble}>
                  <span style={s.dot1} /><span style={s.dot2} /><span style={s.dot3} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 入力エリア */}
          <div style={s.inputRow}>
            <input
              ref={inputRef}
              style={s.chatInput}
              placeholder="何でも聞いてください..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
            />
            <button
              style={{ ...s.sendBtn, opacity: input.trim() && !thinking ? 1 : 0.35 }}
              onClick={sendMessage}
              disabled={!input.trim() || thinking}
              aria-label="送信"
            >
              <i className="ti ti-send" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── FABボタン ── */}
      <button
        style={{ ...s.fab, ...(open ? s.fabOpen : {}) }}
        onClick={() => setOpen((v) => !v)}
        title={open ? "閉じる" : "AIアシスタントを開く"}
        aria-label="AIアシスタント"
      >
        <i
          className={`ti ${open ? "ti-x" : "ti-message-chatbot"}`}
          style={{ fontSize: 22, transition: "transform 0.2s" }}
          aria-hidden="true"
        />
      </button>

    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
  },

  // パネル
  panel: {
    width: 340,
    height: 480,
    borderRadius: 14,
    border: "0.5px solid var(--color-border-mid)",
    background: "var(--color-bg)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "var(--color-bg-secondary)",
    borderBottom: "0.5px solid var(--color-border)",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    lineHeight: 1.2,
  },
  poweredBy: {
    fontSize: 10,
    color: "var(--color-text-tertiary)",
    marginTop: 1,
  },
  closeBtn: {
    width: 26,
    height: 26,
    border: "0.5px solid var(--color-border)",
    borderRadius: 6,
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    color: "var(--color-text-secondary)",
  },

  // メッセージ
  messageList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "14px 12px 4px",
  },
  aiRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  aiLabel: {
    fontSize: 10,
    color: "var(--color-text-tertiary)",
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  userBubble: {
    maxWidth: "82%",
    padding: "8px 11px",
    borderRadius: "12px 12px 2px 12px",
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    fontSize: 12.5,
    lineHeight: 1.55,
  },
  aiBubble: {
    maxWidth: "88%",
    padding: "8px 11px",
    borderRadius: "12px 12px 12px 2px",
    background: "var(--color-bg-secondary)",
    color: "var(--color-text-primary)",
    fontSize: 12.5,
    lineHeight: 1.55,
    border: "0.5px solid var(--color-border)",
    display: "flex",
    gap: 4,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },

  // 入力
  inputRow: {
    display: "flex",
    gap: 6,
    padding: "10px 12px",
    borderTop: "0.5px solid var(--color-border)",
    flexShrink: 0,
    background: "var(--color-bg-secondary)",
  },
  chatInput: {
    flex: 1,
    padding: "7px 11px",
    fontSize: 12.5,
    border: "0.5px solid var(--color-border-mid)",
    borderRadius: 8,
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
    outline: "none",
    fontFamily: "inherit",
  },
  sendBtn: {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 8,
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    flexShrink: 0,
  },

  // FABボタン
  fab: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "none",
    background: "var(--color-text-primary)",
    color: "var(--color-bg)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)",
    transition: "transform 0.15s, box-shadow 0.15s",
    flexShrink: 0,
  },
  fabOpen: {
    background: "var(--color-text-secondary)",
  },

  // タイピングドット（globals.cssのbounceアニメーション使用）
  dot1: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0s" },
  dot2: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0.2s" },
  dot3: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0.4s" },
};
