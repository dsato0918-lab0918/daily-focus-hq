"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { todayDue, tomorrowDue, formatDueDisplay } from "@/lib/data";
import type { Domain, DomainKey, Project, Task } from "@/lib/types";

interface Props {
  tasks: Task[];
  projects: Project[];
  domains: Domain[];
  curDomain: DomainKey;
  curProjId: string | null;
  selTaskId: string | null;
  onSelectTask: (id: string) => void;
  onToggleDone: (id: string) => void;
  onAddTask: (title: string, projId: string, due: string, urgent: boolean) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

function parseDueDate(due: string): Date {
  if (!due) return new Date(9999, 11, 31);
  if (due.includes("-")) return new Date(due + "T00:00:00");
  // 旧形式 MM/DD
  const [m, d] = due.split("/").map(Number);
  return new Date(new Date().getFullYear(), (m || 12) - 1, d || 31);
}

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

type SortKey = "default" | "due" | "urgent";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "登録順" },
  { key: "due",     label: "期限順" },
  { key: "urgent",  label: "急ぎ優先" },
];

function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const arr = [...tasks];
  // 完了タスクは常に末尾へ
  const withDone = (sorted: Task[]) => [
    ...sorted.filter((t) => !t.done),
    ...sorted.filter((t) =>  t.done),
  ];
  if (key === "due")    return withDone(arr.sort((a, b) => parseDueDate(a.due).getTime() - parseDueDate(b.due).getTime()));
  if (key === "urgent") return withDone(arr.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return parseDueDate(a.due).getTime() - parseDueDate(b.due).getTime();
  }));
  return withDone(arr);
}

export default function TaskPane({ tasks, projects, domains, curDomain, curProjId, selTaskId, onSelectTask, onToggleDone, onAddTask, onUpdateTask, onDeleteTask }: Props) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(tomorrowDue());
  const [urgent, setUrgent] = useState(false);
  const [projId, setProjId] = useState<string>("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  // ── 今日のミッション ──────────────────────────────────────────
  const [missionIds, setMissionIds] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem("sugar-task-mission");
      if (s) { const { date, ids } = JSON.parse(s); if (date === todayStr()) return ids as string[]; }
    } catch { /* ignore */ }
    return [];
  });
  const [missionSelecting, setMissionSelecting] = useState(false);
  const [missionDraft, setMissionDraft] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevMissionDone = useRef(0);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDue, setEditingDue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTaskId) editRef.current?.focus(); }, [editingTaskId]);

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDue(task.due && task.due.includes("-") ? task.due : "");
  };
  const confirmEdit = (id: string) => {
    if (editingTitle.trim()) onUpdateTask(id, { title: editingTitle.trim(), due: editingDue });
    setEditingTaskId(null);
  };
  const cancelEdit = () => setEditingTaskId(null);

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // ミッション達成数
  const missionDoneCount = useMemo(
    () => missionIds.filter((id) => tasks.find((t) => t.id === id)?.done).length,
    [missionIds, tasks]
  );

  // ミッション全完了で紙吹雪
  useEffect(() => {
    if (missionIds.length === 3 && missionDoneCount === 3 && prevMissionDone.current < 3) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4500);
    }
    prevMissionDone.current = missionDoneCount;
  }, [missionDoneCount, missionIds.length]);

  // ミッション保存
  const saveMission = useCallback((ids: string[]) => {
    setMissionIds(ids);
    try { localStorage.setItem("sugar-task-mission", JSON.stringify({ date: todayStr(), ids })); } catch { /* ignore */ }
  }, []);

  // 「これ忘れてない？」候補タスク（期限超過・未完了・ミッション外）
  const forgottenTask = useMemo(() => {
    const today = new Date(new Date().toDateString());
    return tasks
      .filter((t) => !t.done && !missionIds.includes(t.id) && !projMap.get(t.projId)?.archived && t.due)
      .map((t) => ({ t, overdue: Math.ceil((today.getTime() - parseDueDate(t.due).getTime()) / 86400000) }))
      .filter((x) => x.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue)[0]?.t ?? null;
  }, [tasks, missionIds, projMap]);

  // タスク追加フォームで選択できるプロジェクト（常に全アクティブPJ）
  const selectableProjects = useMemo(
    () => projects.filter((p) => !p.archived),
    [projects]
  );

  useEffect(() => {
    if (adding) {
      const defaultProj = curProjId ?? selectableProjects[0]?.id ?? "";
      setProjId(defaultProj);
      setDue(tomorrowDue());
      setUrgent(false);
      setTitle("");
      inputRef.current?.focus();
    }
  }, [adding]);

  const confirmAdd = () => {
    if (title.trim() && projId) {
      onAddTask(title.trim(), projId, due, urgent);
      setTitle("");
      setDue(tomorrowDue());
      setUrgent(false);
      setAdding(false);
    }
  };

  const cancelAdd = () => {
    setTitle("");
    setAdding(false);
  };

  const visibleTasks = useMemo(() => {
    // アーカイブ済みプロジェクトのタスクは常に除外
    let filtered = tasks.filter((t) => !projMap.get(t.projId)?.archived);
    if (curProjId) filtered = filtered.filter((t) => t.projId === curProjId);
    else if (curDomain !== "all") filtered = filtered.filter((t) => projMap.get(t.projId)?.domain === curDomain);
    if (!showDone) filtered = filtered.filter((t) => !t.done);
    return sortTasks(filtered, sortBy);
  }, [tasks, curProjId, curDomain, projMap, sortBy, showDone]);

  const doneCnt = visibleTasks.filter((t) => t.done).length;
  const progress = visibleTasks.length ? Math.round((doneCnt / visibleTasks.length) * 100) : 0;

  const domainColorMap = useMemo(() => {
    const map: Record<string, { bg: string; color: string }> = {};
    domains.forEach((d) => { map[d.id] = { bg: d.bgColor, color: d.textColor }; });
    return map;
  }, [domains]);

  const renderTaskRow = (task: Task) => {
    const proj = projMap.get(task.projId);
    const domKey = proj?.domain ?? "";
    const domColor = domainColorMap[domKey] ?? { bg: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" };
    const isSelected = selTaskId === task.id;
    const isEditing = editingTaskId === task.id;
    const isOverdue  = !task.done && !!task.due && parseDueDate(task.due) < new Date(new Date().toDateString());

    return (
      <div
        key={task.id}
        onClick={() => !isEditing && onSelectTask(task.id)}
        onMouseEnter={() => setHoveredTaskId(task.id)}
        onMouseLeave={() => setHoveredTaskId(null)}
        style={{
          ...styles.taskRow,
          background: isSelected
            ? "var(--color-info-bg)"
            : isOverdue
            ? "var(--color-overdue-bg)"
            : hoveredTaskId === task.id
            ? "var(--color-bg-secondary)"
            : "transparent",
          borderLeft: isOverdue ? "3px solid var(--color-overdue-border)" : "3px solid transparent",
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(task.id); }}
          style={{ ...styles.checkbox, background: task.done ? "var(--color-success-bg)" : "transparent", borderColor: task.done ? "var(--color-success-text)" : "var(--color-border-mid)" }}
          aria-label={task.done ? "完了を取り消す" : "完了にする"}
        >
          {task.done && <i className="ti ti-check" style={{ fontSize: 10, color: "var(--color-success-text)" }} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                ref={editRef}
                style={styles.editInput}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) confirmEdit(task.id);
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <i className="ti ti-calendar" style={{ fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                <input
                  type="date"
                  style={{ ...styles.editInput, marginBottom: 0, flex: 1 }}
                  value={editingDue}
                  onChange={(e) => setEditingDue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit(task.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                {editingDue && (
                  <button
                    style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "var(--color-text-tertiary)", lineHeight: 1 }}
                    onClick={() => setEditingDue("")}
                    title="期限をクリア"
                  >
                    <i className="ti ti-x" style={{ fontSize: 10 }} />
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                <button style={styles.editConfirmBtn} onClick={() => confirmEdit(task.id)}>保存</button>
                <button style={styles.editCancelBtn} onClick={cancelEdit}>キャンセル</button>
              </div>
            </div>
          ) : (
            <div className="task-item-title" style={{ fontSize: 12.5, color: task.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)", textDecoration: task.done ? "line-through" : "none", lineHeight: 1.4 }}>
              {task.title}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
            {task.urgent && !task.done && <span style={{ ...styles.chip, background: "#FCEBEB", color: "#A32D2D", border: "none" }}>急ぎ</span>}
            {task.due && (
              <span style={{ ...styles.chip, ...(isOverdue ? { background: "var(--color-overdue-bg)", color: "var(--color-overdue-text)", border: "0.5px solid var(--color-overdue-border)" } : {}) }}>
                {formatDueDisplay(task.due)}
              </span>
            )}
            {proj && <span style={{ ...styles.chip, background: domColor.bg, color: domColor.color, border: "none" }}>{proj.name}</span>}
            {task.staffRequested && (
              <span style={{ ...styles.chip, background: "#F4ECF5", color: "#4A154B", border: "0.5px solid #C9A8CB", display: "inline-flex", alignItems: "center", gap: 3 }}>
                <i className="ti ti-brand-slack" style={{ fontSize: 9 }} />スタッフ依頼済
                <button onClick={(e) => { e.stopPropagation(); onUpdateTask(task.id, { staffRequested: false }); }} style={styles.tagRemoveBtn} title="タグを削除">
                  <i className="ti ti-x" style={{ fontSize: 8 }} />
                </button>
              </span>
            )}
            {task.vendorRequested && (
              <span style={{ ...styles.chip, background: "#E8F8EC", color: "#1B7F3A", border: "0.5px solid #A8D9B4", display: "inline-flex", alignItems: "center", gap: 3 }}>
                <i className="ti ti-brand-line" style={{ fontSize: 9 }} />業者依頼済
                <button onClick={(e) => { e.stopPropagation(); onUpdateTask(task.id, { vendorRequested: false }); }} style={styles.tagRemoveBtn} title="タグを削除">
                  <i className="ti ti-x" style={{ fontSize: 8 }} />
                </button>
              </span>
            )}
          </div>
        </div>

        {hoveredTaskId === task.id && !isEditing && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.rowIconBtn}
              onClick={() => startEdit(task)}
              title="タイトルを編集"
            >
              <i className="ti ti-pencil" />
            </button>
            <button
              style={styles.rowIconBtn}
              onClick={() => onDeleteTask(task.id)}
              title="削除"
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderList = () => {
    const rows: React.ReactNode[] = [];

    rows.push(
      <div key="progress" style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
    );

    if (curDomain === "all" && !curProjId) {
      domains.forEach((d) => {
        const domTasks = visibleTasks.filter((t) => projMap.get(t.projId)?.domain === d.id);
        if (!domTasks.length) return;
        rows.push(<div key={`sec-${d.id}`} style={styles.sectionLabel}>{d.label}</div>);
        domTasks.forEach((t) => rows.push(renderTaskRow(t)));
      });
    } else {
      visibleTasks.forEach((t) => rows.push(renderTaskRow(t)));
    }

    if (!visibleTasks.length) {
      rows.push(<div key="empty" style={styles.empty}>タスクがありません</div>);
    }

    // 追加フォーム
    if (adding) {
      rows.push(
        <div key="add-form" style={styles.addForm}>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder="タスク名..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) confirmAdd();
              if (e.key === "Escape") cancelAdd();
            }}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              type="date"
              style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              急ぎ
            </label>
          </div>
          <select style={{ ...styles.input, marginBottom: 6 }} value={projId} onChange={(e) => setProjId(e.target.value)}>
            {selectableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={styles.confirmBtn} onClick={confirmAdd}>追加</button>
            <button style={styles.cancelBtn} onClick={cancelAdd}>キャンセル</button>
          </div>
        </div>
      );
    } else {
      const isProjectPending = projId.startsWith("temp_") || (curProjId?.startsWith("temp_") ?? false);
      rows.push(
        <button
          key="add-btn"
          style={{ ...styles.addBtn, opacity: isProjectPending ? 0.5 : 1, cursor: isProjectPending ? "not-allowed" : "pointer" }}
          onClick={() => !isProjectPending && setAdding(true)}
          title={isProjectPending ? "プロジェクト作成中..." : ""}
        >
          <i className={`ti ${isProjectPending ? "ti-loader-2" : "ti-plus"}`} aria-hidden="true" />
          {isProjectPending ? "プロジェクト作成中..." : "タスクを追加"}
        </button>
      );
    }

    return rows;
  };

  // ── 紙吹雪コンポーネント ──────────────────────────────────────
  const Confetti = () => {
    const COLORS = ["#185FA5","#378ADD","#FFD700","#FF6B6B","#51CF66","#FF8C00","#9B59B6","#E91E63"];
    const pieces = useRef(Array.from({ length: 90 }, (_, i) => ({
      id: i, color: COLORS[i % COLORS.length],
      left: Math.random() * 100, delay: Math.random() * 1.8,
      duration: 2.5 + Math.random() * 2,
      size: 7 + Math.random() * 9,
      isCircle: Math.random() > 0.5,
      rotateEnd: 360 + Math.random() * 720,
    }))).current;
    return (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        {pieces.map((p) => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.left}%`, top: "-20px",
            width: p.size, height: p.size, background: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }} />
        ))}
        <div style={{ position: "absolute", top: "32%", left: "50%", transform: "translateX(-50%)", textAlign: "center", animation: "celebrationPop 0.5s ease-out forwards" }}>
          <div style={{ fontSize: 58 }}>🎉</div>
          <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: "#185FA5", background: "white", padding: "10px 28px", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", whiteSpace: "nowrap" }}>
            今日のミッション完了！
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#64748B", background: "white", padding: "4px 16px", borderRadius: 8 }}>
            お疲れさまでした ✨
          </div>
        </div>
      </div>
    );
  };

  // ── 今日のミッションセクション ────────────────────────────────
  const renderMissionSection = () => {
    const allUndone = tasks.filter((t) => !t.done && !projMap.get(t.projId)?.archived);

    // 選択モード
    if (missionSelecting) {
      return (
        <div style={styles.missionSelectPanel}>
          <div style={styles.missionSelectTitle}>
            <i className="ti ti-target" style={{ fontSize: 13 }} aria-hidden="true" />
            今日やる3つを選んでください
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-text-tertiary)" }}>
              {missionDraft.length} / 3
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {allUndone.length === 0 && <div style={styles.empty}>未完了タスクがありません</div>}
            {allUndone.map((task) => {
              const proj = projMap.get(task.projId);
              const isChecked = missionDraft.includes(task.id);
              return (
                <div key={task.id}
                  onClick={() => {
                    if (isChecked) setMissionDraft((p) => p.filter((id) => id !== task.id));
                    else if (missionDraft.length < 3) setMissionDraft((p) => [...p, task.id]);
                  }}
                  style={{ ...styles.missionSelectRow, background: isChecked ? "var(--color-info-bg)" : "transparent", cursor: missionDraft.length >= 3 && !isChecked ? "not-allowed" : "pointer", opacity: missionDraft.length >= 3 && !isChecked ? 0.4 : 1 }}
                >
                  <div style={{ ...styles.missionCheckbox, borderColor: isChecked ? "var(--color-info-text)" : "var(--color-border-mid)", background: isChecked ? "var(--color-info-text)" : "transparent" }}>
                    {isChecked && <i className="ti ti-check" style={{ fontSize: 9, color: "white" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="task-item-title" style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{task.title}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                      {proj?.name}{task.due ? ` · ${formatDueDisplay(task.due)}` : ""}{task.urgent ? " · 急ぎ" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "0.5px solid var(--color-border)", flexShrink: 0 }}>
            <button style={styles.missionConfirmBtn}
              disabled={missionDraft.length === 0}
              onClick={() => { saveMission(missionDraft); setMissionSelecting(false); }}
            >
              {missionDraft.length > 0 ? `${missionDraft.length}つで今日スタート！` : "タスクを選んでください"}
            </button>
            <button style={styles.missionCancelBtn} onClick={() => { setMissionSelecting(false); setMissionDraft([]); }}>キャンセル</button>
          </div>
        </div>
      );
    }

    // 未設定
    if (missionIds.length === 0) {
      return (
        <div style={styles.missionEmpty}>
          <i className="ti ti-target" style={{ fontSize: 22, color: "var(--color-text-tertiary)", marginBottom: 6 }} aria-hidden="true" />
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>今日やる3つを決めましょう</div>
          <button style={styles.missionStartBtn} onClick={() => { setMissionDraft([]); setMissionSelecting(true); }}>
            <i className="ti ti-plus" aria-hidden="true" /> 今日を設定する
          </button>
        </div>
      );
    }

    // 設定済み
    const allDone = missionDoneCount === missionIds.length;
    return (
      <div style={{ padding: "8px 10px 10px" }}>
        {/* 進捗バー */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 6, background: "var(--color-bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: allDone ? "var(--color-dot-green)" : "var(--color-info-text)", width: `${(missionDoneCount / missionIds.length) * 100}%`, transition: "width 0.4s ease" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: allDone ? "var(--color-dot-green)" : "var(--color-text-secondary)", flexShrink: 0 }}>
            {missionDoneCount} / {missionIds.length}
          </span>
        </div>
        {/* ミッションタスク一覧 */}
        {missionIds.map((id, i) => {
          const task = tasks.find((t) => t.id === id);
          if (!task) return null;
          const proj = projMap.get(task.projId);
          return (
            <div key={id} onClick={() => onSelectTask(id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer", borderRadius: 6, marginBottom: 2 }}
            >
              <button onClick={(e) => { e.stopPropagation(); onToggleDone(id); }}
                style={{ ...styles.checkbox, background: task.done ? "var(--color-success-bg)" : "transparent", borderColor: task.done ? "var(--color-success-text)" : "var(--color-border-mid)", flexShrink: 0 }}
              >
                {task.done && <i className="ti ti-check" style={{ fontSize: 10, color: "var(--color-success-text)" }} />}
              </button>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="task-item-title" style={{ fontSize: 12, color: task.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)", textDecoration: task.done ? "line-through" : "none" }}>{task.title}</div>
                {proj && <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{proj.name}{task.due ? ` · ${formatDueDisplay(task.due)}` : ""}</div>}
              </div>
            </div>
          );
        })}
        <button style={{ ...styles.missionCancelBtn, marginTop: 6, width: "100%", justifyContent: "center" }}
          onClick={() => { setMissionDraft(missionIds); setMissionSelecting(true); }}
        >
          <i className="ti ti-edit" style={{ fontSize: 11 }} /> 変更する
        </button>
      </div>
    );
  };

  // ── 「これ忘れてない？」セクション ────────────────────────────
  const renderForgotSection = () => {
    if (!forgottenTask) return null;
    const proj = projMap.get(forgottenTask.projId);
    const today = new Date(new Date().toDateString());
    const overdueDays = Math.ceil((today.getTime() - parseDueDate(forgottenTask.due).getTime()) / 86400000);
    return (
      <div style={styles.forgotSection}>
        <div style={styles.forgotHeader}>
          <i className="ti ti-alert-circle" style={{ fontSize: 10, color: "#BA7517" }} aria-hidden="true" />
          これ忘れてない？
        </div>
        <div onClick={() => onSelectTask(forgottenTask.id)} style={styles.forgotCard}>
          <span className="task-item-title" style={{ fontSize: 11, flex: 1, color: "var(--color-text-primary)" }}>{forgottenTask.title}</span>
          <span style={{ fontSize: 10, color: "#BA7517", flexShrink: 0, fontWeight: 500 }}>{overdueDays}日超過</span>
        </div>
        {proj && <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", padding: "0 10px 6px" }}>{proj.name}</div>}
      </div>
    );
  };

  return (
    <div style={styles.pane}>

      {/* ── ペインヘッダー ── */}
      <div style={styles.paneHeader}>タスク管理</div>

      {/* ── 紙吹雪 ── */}
      {showCelebration && <Confetti />}

      {/* ── 上段: 今日のミッション ── */}
      <div style={{ ...styles.focusSection, maxHeight: missionSelecting ? "340px" : undefined }}>
        <div style={styles.sectionHeader}>
          <i className="ti ti-target" style={{ fontSize: 11, marginRight: 5 }} aria-hidden="true" />
          今日のミッション
          {missionIds.length > 0 && !missionSelecting && (
            <span style={{ marginLeft: 6, fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 400, textTransform: "none" as const, letterSpacing: 0 }}>
              {missionDoneCount === missionIds.length ? "✅ 完了！" : `${missionDoneCount}/${missionIds.length} 完了`}
            </span>
          )}
        </div>
        {renderMissionSection()}
        {renderForgotSection()}
      </div>

      {/* ── 下段: タスク一覧 ── */}
      <div style={styles.listSection}>
        <div style={styles.sectionHeader}>タスク一覧</div>
        <div style={styles.sortBar}>
          <i className="ti ti-arrows-sort" style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginRight: 2 }} aria-hidden="true" />
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              style={{ ...styles.sortBtn, ...(sortBy === opt.key ? styles.sortBtnActive : {}) }}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <button
              style={{ ...styles.sortBtn, ...(showDone ? styles.sortBtnActive : {}), display: "flex", alignItems: "center", gap: 3 }}
              onClick={() => setShowDone((v) => !v)}
            >
              <i className={`ti ${showDone ? "ti-eye" : "ti-eye-off"}`} style={{ fontSize: 11 }} aria-hidden="true" />
              完了済み
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {renderList()}
        </div>
      </div>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pane: { display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border)", background: "var(--color-bg)", overflow: "hidden", height: "100%" },

  paneHeader: { padding: "10px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)", letterSpacing: "0.04em", textTransform: "uppercase" as const, flexShrink: 0 },

  // 上段: 今日のフォーカス
  focusSection: { flexShrink: 0, borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column" },
  focusScroll: { display: "flex", flexDirection: "row", gap: 8, padding: "8px 10px 10px", overflowX: "auto" as const },
  sectionHeader: { padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)", letterSpacing: "0.04em", textTransform: "uppercase" as const, flexShrink: 0, display: "flex", alignItems: "center" },

  // 下段: タスク一覧
  listSection: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 },
  sortBar: { display: "flex", alignItems: "center", padding: "5px 10px", borderBottom: "0.5px solid var(--color-border)", background: "var(--color-bg-secondary)", flexShrink: 0, gap: 3, overflowX: "auto" as const },
  sortBtn: { padding: "2px 8px", fontSize: 10, border: "0.5px solid var(--color-border)", borderRadius: 10, background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" as const, fontFamily: "inherit" },
  sortBtnActive: { background: "var(--color-text-primary)", color: "var(--color-bg)", borderColor: "var(--color-text-primary)" },

  taskRow: { display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 12px", borderBottom: "0.5px solid var(--color-border)", cursor: "pointer" },
  checkbox: { width: 15, height: 15, borderRadius: 3, border: "1.5px solid", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  rowIconBtn: { width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--color-text-tertiary)", padding: 0 },
  editInput: { width: "100%", padding: "2px 6px", fontSize: 12.5, border: "0.5px solid var(--color-border-mid)", borderRadius: 4, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit", marginBottom: 2 },
  editConfirmBtn: { flex: 1, padding: "3px 8px", fontSize: 11, fontWeight: 500, border: "0.5px solid var(--color-border-mid)", borderRadius: 4, background: "var(--color-info-bg)", color: "var(--color-info-text)", cursor: "pointer", fontFamily: "inherit" },
  editCancelBtn:  { flex: 1, padding: "3px 8px", fontSize: 11, border: "0.5px solid var(--color-border)", borderRadius: 4, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" },
  chip: { fontSize: 10, padding: "1px 6px", borderRadius: 4, border: "0.5px solid var(--color-border)", color: "var(--color-text-secondary)", background: "transparent" },
  tagRemoveBtn: { border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", color: "inherit", opacity: 0.6, lineHeight: 1 },
  sectionLabel: { padding: "6px 12px", fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)" },
  progressBar: { height: 3, background: "var(--color-bg-secondary)", borderRadius: 2, margin: "8px 12px" },
  progressFill: { height: "100%", borderRadius: 2, background: "var(--color-dot-green)", transition: "width 0.3s ease" },
  empty: { padding: "20px 12px", fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", border: "none", borderBottom: "0.5px solid var(--color-border)", width: "100%", textAlign: "left", fontSize: 12, cursor: "pointer", color: "var(--color-text-tertiary)", background: "transparent" },
  addForm: { padding: "8px 10px", borderBottom: "0.5px solid var(--color-border)", background: "var(--color-bg-secondary)" },
  input: { width: "100%", padding: "5px 8px", fontSize: 12, border: "0.5px solid var(--color-border-mid)", borderRadius: 6, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", marginBottom: 6, fontFamily: "inherit" },
  confirmBtn: { flex: 1, padding: "4px 8px", fontSize: 11, fontWeight: 500, border: "0.5px solid var(--color-border-mid)", borderRadius: 5, background: "var(--color-info-bg)", color: "var(--color-info-text)", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "4px 8px", fontSize: 11, border: "0.5px solid var(--color-border)", borderRadius: 5, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" },
  // ミッション
  missionEmpty: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "18px 12px" },
  missionStartBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", border: "1px solid var(--color-info-text)", borderRadius: 20, background: "var(--color-info-bg)", color: "var(--color-info-text)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  missionSelectPanel: { display: "flex", flexDirection: "column" as const, maxHeight: 300, overflow: "hidden" },
  missionSelectTitle: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border)", background: "var(--color-bg-secondary)", flexShrink: 0 },
  missionSelectRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "0.5px solid var(--color-border)", transition: "background 0.1s" },
  missionCheckbox: { width: 16, height: 16, borderRadius: 4, border: "1.5px solid", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  missionConfirmBtn: { flex: 2, padding: "8px 0", border: "none", borderRadius: 8, background: "var(--color-info-text)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  missionCancelBtn: { flex: 1, padding: "6px 0", border: "0.5px solid var(--color-border)", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" },
  // 忘れてない？
  forgotSection: { borderTop: "0.5px solid var(--color-border)", background: "var(--color-bg)" },
  forgotHeader: { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 9, fontWeight: 500, color: "#BA7517", letterSpacing: "0.04em", textTransform: "uppercase" as const },
  forgotCard: { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", cursor: "pointer" },
};
