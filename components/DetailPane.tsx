"use client";

import { useState, useRef, useEffect } from "react";
import type { Project, Task } from "@/lib/types";

interface Props {
  task: Task | null;
  project: Project | null;
  onMemoChange: (id: string, memo: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

interface Message {
  role: "user" | "ai";
  text: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  design: "設計",
  const:  "施工",
  mgmt:   "経営",
};

const DOMAIN_COLORS: Record<string, { bg: string; color: string }> = {
  design: { bg: "var(--color-design-bg)", color: "var(--color-design-text)" },
  const:  { bg: "var(--color-const-bg)",  color: "var(--color-const-text)" },
  mgmt:   { bg: "var(--color-mgmt-bg)",   color: "var(--color-mgmt-text)" },
};

// モックAI返答（実装時はAPIに置き換え）
const MOCK_REPLIES = [
  "まず全体の優先度を整理しましょう。このタスクの締め切りと、他の進行中のタスクとの兼ね合いを確認すると手をつけやすくなります。",
  "一番ハードルの低い部分から着手するのが効果的です。具体的にどのステップで詰まっていますか？",
  "関係者への確認が必要な部分と、自分だけで進められる部分を分けてみるとよいかもしれません。",
  "今日中に完了すべきことと、明日以降に回せることを切り分けてみましょう。",
];

let mockReplyIndex = 0;
function nextMockReply() {
  const reply = MOCK_REPLIES[mockReplyIndex % MOCK_REPLIES.length];
  mockReplyIndex++;
  return reply;
}

export default function DetailPane({ task, project, onMemoChange, onUpdateTask, onDeleteTask }: Props) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showStaffRequest, setShowStaffRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [showVendorRequest, setShowVendorRequest] = useState(false);
  const [vendorSent, setVendorSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);

  const startEditTitle = () => { if (!task) return; setTitleValue(task.title); setEditingTitle(true); };
  const confirmEditTitle = () => {
    if (task && titleValue.trim()) onUpdateTask(task.id, { title: titleValue.trim() });
    setEditingTitle(false);
  };
  const handleDelete = () => {
    if (!task) return;
    if (confirmDelete) { onDeleteTask(task.id); setConfirmDelete(false); }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
  };

  // タスクが変わったらチャット・依頼パネルをリセット
  useEffect(() => {
    setChatOpen(false);
    setMessages([]);
    setInput("");
    setShowStaffRequest(false);
    setRequestSent(false);
    setShowVendorRequest(false);
    setVendorSent(false);
  }, [task?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  const openChat = () => {
    if (!task) return;
    const initial: Message = {
      role: "user",
      text: `「${task.title}」について、今日どこから手をつけるか一緒に考えてほしい`,
    };
    setMessages([initial]);
    setChatOpen(true);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages((prev) => [...prev, { role: "ai", text: nextMockReply() }]);
    }, 1400);
  };

  const sendMessage = () => {
    if (!input.trim() || thinking) return;
    const userMsg: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages((prev) => [...prev, { role: "ai", text: nextMockReply() }]);
    }, 1200);
  };

  if (!task) {
    return (
      <div style={styles.pane}>
        <div style={styles.header}>詳細</div>
        <div style={styles.empty}>タスクを選択してください</div>
      </div>
    );
  }

  const domKey = project?.domain ?? "design";
  const domColor = DOMAIN_COLORS[domKey] ?? DOMAIN_COLORS.design;
  const domLabel = DOMAIN_LABELS[domKey] ?? "";

  // スタッフへの依頼定型文
  const staffRequestDraft = task
    ? `【タスク依頼】\nプロジェクト：${project?.name ?? "未設定"}\nタスク：${task.title}\n期限：${task.due}${task.urgent ? "（急ぎ）" : ""}\n${task.memo ? `\nメモ：\n${task.memo}\n` : ""}\n対応をお願いします。`
    : "";

  // 協力業者への依頼定型文（LINE）
  const vendorRequestDraft = task
    ? `いつもお世話になっております。\nSUGAR DESIGN OFFICEです。\n\n下記の件につきまして、ご対応をお願いしたくご連絡いたしました。\n\n■ プロジェクト：${project?.name ?? "未設定"}\n■ 内容：${task.title}\n■ 期限：${task.due}${task.urgent ? "（至急）" : ""}\n${task.memo ? `\n■ 詳細：\n${task.memo}\n` : ""}\nご確認の上、折り返しご連絡いただけますと幸いです。\nよろしくお願いいたします。`
    : "";

  // ── チャットビュー ──────────────────────────────────────────────
  if (chatOpen) {
    return (
      <div style={styles.pane}>
        <div style={styles.chatHeader}>
          <button style={styles.backBtn} onClick={() => setChatOpen(false)}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
          </button>
          <span style={{ fontSize: 12, fontWeight: 500 }}>AI相談</span>
          <span style={styles.poweredBy}>Powered by Groq</span>
        </div>

        <div style={styles.chatContext}>
          <i className="ti ti-file-text" style={{ fontSize: 11, marginRight: 4 }} aria-hidden="true" />
          {task.title}
        </div>

        <div style={styles.messageList}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              {msg.role === "ai" && (
                <div style={styles.aiLabel}>
                  <i className="ti ti-sparkles" style={{ fontSize: 10 }} aria-hidden="true" /> AI
                </div>
              )}
              <div style={msg.role === "user" ? styles.userBubble : styles.aiBubble}>
                {msg.text}
              </div>
            </div>
          ))}

          {thinking && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={styles.aiLabel}>
                <i className="ti ti-sparkles" style={{ fontSize: 10 }} aria-hidden="true" /> AI
              </div>
              <div style={styles.aiBubble}>
                <span style={styles.dot1} />
                <span style={styles.dot2} />
                <span style={styles.dot3} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={styles.inputRow}>
          <textarea
            ref={inputRef}
            style={styles.chatInput}
            placeholder="メッセージを入力... (Enter で送信 / Shift+Enter で改行)"
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            style={{ ...styles.sendBtn, opacity: input.trim() && !thinking ? 1 : 0.4 }}
            onClick={sendMessage}
            disabled={!input.trim() || thinking}
            aria-label="送信"
          >
            <i className="ti ti-send" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // ── 詳細ビュー ──────────────────────────────────────────────────
  return (
    <div style={styles.pane}>
      <div style={styles.header}>
        詳細
        <button
          style={{ ...styles.deleteBtn, marginLeft: "auto", color: confirmDelete ? "#E24B4A" : undefined, borderColor: confirmDelete ? "#E24B4A" : undefined }}
          onClick={handleDelete}
          title={confirmDelete ? "もう一度クリックで削除" : "タスクを削除"}
        >
          <i className={confirmDelete ? "ti ti-alert-triangle" : "ti ti-trash"} />
          {confirmDelete ? "確認" : "削除"}
        </button>
      </div>
      <div style={styles.body}>
        {/* タイトル（クリックで編集） */}
        <div style={styles.fieldLabel}>タスク</div>
        {editingTitle ? (
          <input
            ref={titleRef}
            style={{ ...styles.memo, height: "auto", resize: "none", marginBottom: 10, padding: "4px 8px", fontSize: 14, fontWeight: 500 }}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmEditTitle(); if (e.key === "Escape") setEditingTitle(false); }}
            onBlur={confirmEditTitle}
          />
        ) : (
          <div style={{ ...styles.taskTitle, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 4 }}
            onClick={startEditTitle} title="クリックで編集">
            {task.title}
            <i className="ti ti-pencil" style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2, flexShrink: 0 }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ ...styles.chip, background: domColor.bg, color: domColor.color }}>{domLabel}</span>
          {project && <span style={styles.chip}>{project.name}</span>}
          {/* 急ぎフラグ切り替え */}
          <button
            style={{ ...styles.chip, cursor: "pointer", border: "none", background: task.urgent ? "#FCEBEB" : "var(--color-bg-secondary)", color: task.urgent ? "#A32D2D" : "var(--color-text-tertiary)" }}
            onClick={() => onUpdateTask(task.id, { urgent: !task.urgent })}
            title="急ぎフラグを切り替え"
          >
            {task.urgent ? "急ぎ ✕" : "+ 急ぎ"}
          </button>
          {task.staffRequested && (
            <span style={{ ...styles.chip, background: "#F4ECF5", color: "#4A154B", border: "0.5px solid #C9A8CB" }}>
              <i className="ti ti-brand-slack" style={{ fontSize: 9, marginRight: 2 }} />スタッフ依頼済
            </span>
          )}
          {task.vendorRequested && (
            <span style={{ ...styles.chip, background: "#E8F8EC", color: "#1B7F3A", border: "0.5px solid #A8D9B4" }}>
              <i className="ti ti-brand-line" style={{ fontSize: 9, marginRight: 2 }} />業者依頼済
            </span>
          )}
        </div>

        {/* 期限（クリックで編集） */}
        <div style={styles.fieldLabel}>期限</div>
        <input
          style={{ ...styles.memo, height: "auto", resize: "none", marginBottom: 14, padding: "4px 8px", fontSize: 13, width: 90 }}
          value={task.due}
          placeholder="MM/DD"
          onChange={(e) => onUpdateTask(task.id, { due: e.target.value })}
        />

        <div style={styles.fieldLabel}>メモ</div>
        <textarea
          style={styles.memo}
          rows={4}
          placeholder="メモを追加..."
          value={task.memo}
          onChange={(e) => onMemoChange(task.id, e.target.value)}
        />

        {/* ── スタッフへ依頼 ── */}
        <div style={styles.fieldLabel}>アクション</div>
        <button
          style={styles.staffRequestBtn}
          onClick={() => { setShowStaffRequest(true); setRequestSent(false); }}
        >
          <i className="ti ti-send" style={{ fontSize: 13 }} aria-hidden="true" />
          スタッフへ依頼
        </button>

        {/* 依頼プレビューパネル */}
        {showStaffRequest && (
          <div style={styles.staffPanel}>
            <div style={styles.staffPanelHeader}>
              <i className="ti ti-brand-slack" style={{ fontSize: 13 }} aria-hidden="true" />
              <span>Slack 送信プレビュー</span>
              <button style={styles.staffPanelClose} onClick={() => setShowStaffRequest(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <pre style={styles.draftText}>{staffRequestDraft}</pre>
            {requestSent ? (
              <div style={styles.sentBadge}>
                <i className="ti ti-clock" style={{ fontSize: 11 }} /> Slack連携後に送信できます
              </div>
            ) : (
              <button
                style={styles.slackSendBtn}
                onClick={() => { setRequestSent(true); onUpdateTask(task.id, { staffRequested: true }); }}
              >
                <i className="ti ti-brand-slack" style={{ fontSize: 13 }} />
                Slackに送信する
              </button>
            )}
          </div>
        )}

        {/* 協力業者へ依頼（LINE） */}
        <button
          style={{ ...styles.staffRequestBtn, ...styles.vendorRequestBtn }}
          onClick={() => { setShowVendorRequest(true); setVendorSent(false); }}
        >
          <i className="ti ti-message-circle" style={{ fontSize: 13 }} aria-hidden="true" />
          協力業者様へ依頼
        </button>

        {showVendorRequest && (
          <div style={styles.staffPanel}>
            <div style={{ ...styles.staffPanelHeader, ...styles.vendorPanelHeader }}>
              <i className="ti ti-brand-line" style={{ fontSize: 14 }} aria-hidden="true" />
              <span>LINE 送信プレビュー</span>
              <button style={styles.staffPanelClose} onClick={() => setShowVendorRequest(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <pre style={styles.draftText}>{vendorRequestDraft}</pre>
            {vendorSent ? (
              <div style={styles.sentBadge}>
                <i className="ti ti-clock" style={{ fontSize: 11 }} /> LINE連携後に送信できます
              </div>
            ) : (
              <button
                style={styles.lineSendBtn}
                onClick={() => { setVendorSent(true); onUpdateTask(task.id, { vendorRequested: true }); }}
              >
                <i className="ti ti-brand-line" style={{ fontSize: 14 }} />
                LINEに送信する
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pane: { display: "flex", flexDirection: "column", background: "var(--color-bg)", overflow: "hidden", height: "100%" },
  header: { padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0, display: "flex", alignItems: "center" },
  deleteBtn: { display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", fontSize: 10, border: "0.5px solid var(--color-border)", borderRadius: 4, background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", fontFamily: "inherit" },
  body: { padding: 12, flex: 1, overflowY: "auto" as const },
  fieldLabel: { fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 3 },
  taskTitle: { fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 10, lineHeight: 1.4 },
  fieldValue: { fontSize: 13, color: "var(--color-text-primary)", marginBottom: 14 },
  chip: { fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "0.5px solid var(--color-border)", color: "var(--color-text-secondary)", background: "transparent" },
  memo: { width: "100%", border: "0.5px solid var(--color-border)", borderRadius: 8, padding: "7px 9px", fontSize: 12, fontFamily: "inherit", resize: "none" as const, background: "var(--color-bg)", color: "var(--color-text-primary)", marginBottom: 12, outline: "none" },
  empty: { padding: "30px 12px", fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center" },

  // チャット
  chatHeader: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)", flexShrink: 0 },
  backBtn: { width: 26, height: 26, border: "0.5px solid var(--color-border)", borderRadius: 6, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--color-text-secondary)" },
  poweredBy: { marginLeft: "auto", fontSize: 10, color: "var(--color-text-tertiary)" },
  chatContext: { padding: "6px 12px", fontSize: 11, color: "var(--color-text-tertiary)", background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)", flexShrink: 0, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  messageList: { flex: 1, overflowY: "auto" as const, padding: "12px 10px" },
  aiLabel: { fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 3, display: "flex", alignItems: "center", gap: 3 },
  userBubble: { maxWidth: "85%", padding: "7px 10px", borderRadius: "12px 12px 2px 12px", background: "var(--color-info-bg)", color: "var(--color-info-text)", fontSize: 12, lineHeight: 1.5 },
  aiBubble: { maxWidth: "85%", padding: "7px 10px", borderRadius: "12px 12px 12px 2px", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", fontSize: 12, lineHeight: 1.5, border: "0.5px solid var(--color-border)", display: "flex", gap: 4, alignItems: "center" },
  inputRow: { display: "flex", gap: 6, padding: "8px 10px", borderTop: "0.5px solid var(--color-border)", flexShrink: 0 },
  chatInput: { flex: 1, padding: "6px 10px", fontSize: 12, border: "0.5px solid var(--color-border-mid)", borderRadius: 8, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit", resize: "none" as const, lineHeight: 1.5, minHeight: 30, maxHeight: 100, overflowY: "auto" as const },
  sendBtn: { width: 32, height: 32, border: "none", borderRadius: 8, background: "var(--color-info-bg)", color: "var(--color-info-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 },

  // スタッフへ依頼
  staffRequestBtn: { display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "0.5px solid #C9A8CB", borderRadius: 8, background: "#F4ECF5", color: "#4A154B", cursor: "pointer", fontSize: 12.5, fontWeight: 500, fontFamily: "inherit", width: "100%", marginBottom: 10 },
  staffPanel: { border: "0.5px solid var(--color-border-mid)", borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  staffPanelHeader: { display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#F4ECF5", borderBottom: "0.5px solid #C9A8CB", fontSize: 11.5, fontWeight: 500, color: "#4A154B" },
  staffPanelClose: { marginLeft: "auto", width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--color-text-tertiary)", padding: 0 },
  draftText: { padding: "10px 12px", fontSize: 11.5, color: "var(--color-text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" as const, fontFamily: "inherit", background: "var(--color-bg)", borderBottom: "0.5px solid var(--color-border)", margin: 0 },
  slackSendBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 12px", border: "none", background: "#4A154B", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 500, fontFamily: "inherit" },
  sentBadge: { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px", fontSize: 11.5, color: "var(--color-text-tertiary)", background: "var(--color-bg-secondary)" },
  vendorRequestBtn: { background: "#E8F8EC", color: "#1B7F3A", borderColor: "#A8D9B4", marginTop: 2 },
  vendorPanelHeader: { background: "#E8F8EC", color: "#1B7F3A" },
  lineSendBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 12px", border: "none", background: "#06C755", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 500, fontFamily: "inherit" },

  // タイピングアニメーション用（CSSアニメはglobals.cssで定義）
  dot1: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0s" },
  dot2: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0.2s" },
  dot3: { width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-tertiary)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: "0.4s" },
};
