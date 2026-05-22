"use client";

import { useState, useRef, useEffect } from "react";
import type { Task, Project, Domain } from "@/lib/types";

interface Message {
  role: "user" | "ai";
  text: string;
}

interface Props {
  tasks: Task[];
  projects: Project[];
  domains: Domain[];
}

export default function FloatingAIChat({ tasks, projects, domains }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // パネルを開いたとき最初の挨拶を表示
  useEffect(() => {
    if (open && messages.length === 0) {
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        setMessages([{
          role: "ai",
          text: "こんにちは！Daily Focus HQ のAIアシスタントです。\n現在のタスクやプロジェクトの状況を把握しています。優先順位・進め方・操作方法など、何でもお気軽にご相談ください。",
        }]);
      }, 500);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;

    const userMsg: Message = { role: "user", text: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          tasks,
          projects,
          domains,
        }),
      });

      const data = await res.json();
      const replyText = data.text ?? data.error ?? "応答を取得できませんでした。";
      setMessages((prev) => [...prev, { role: "ai", text: replyText }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "通信エラーが発生しました。しばらく待ってから再試行してください。" }]);
    } finally {
      setThinking(false);
    }
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
                <div style={s.poweredBy}>Powered by Groq</div>
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
            <textarea
              ref={inputRef}
              style={s.chatInput}
              placeholder="何でも聞いてください... (Enter で送信 / Shift+Enter で改行)"
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                // 高さを内容に合わせて自動調整
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                // IME変換中（日本語入力の変換確定）は送信しない
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  sendMessage();
                }
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
    resize: "none" as const,
    lineHeight: 1.5,
    minHeight: 34,
    maxHeight: 120,
    overflowY: "auto" as const,
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
  dot1: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0s" },
  dot2: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0.2s" },
  dot3: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0.4s" },
};
