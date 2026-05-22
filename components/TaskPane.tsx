"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { todayDue } from "@/lib/data";
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

function scoredFocus(tasks: Task[]): Task[] {
  const today = new Date();
  return [...tasks]
    .filter((t) => !t.done)
    .map((t) => {
      let score = 0;
      if (t.urgent) score += 40;
      const [m, d] = t.due.split("/").map(Number);
      const due = new Date(today.getFullYear(), m - 1, d);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 0) score += 50;
      else if (diff === 1) score += 30;
      else if (diff <= 3) score += 15;
      else if (diff <= 7) score += 5;
      return { task: t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.task);
}

const RANK_STYLES = [
  { bg: "var(--color-const-bg)", color: "var(--color-const-text)", label: "#1 最優先" },
  { bg: "var(--color-info-bg)",  color: "var(--color-info-text)",  label: "#2" },
  { bg: "var(--color-mgmt-bg)",  color: "var(--color-mgmt-text)", label: "#3" },
];

type SortKey = "default" | "due" | "urgent";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "登録順" },
  { key: "due",     label: "期限順" },
  { key: "urgent",  label: "急ぎ優先" },
];

function parseDue(due: string): number {
  const [m, d] = due.split("/").map(Number);
  return (m || 12) * 100 + (d || 31);
}

function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const arr = [...tasks];
  if (key === "due")    return arr.sort((a, b) => parseDue(a.due) - parseDue(b.due));
  if (key === "urgent") return arr.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return parseDue(a.due) - parseDue(b.due);
  });
  return arr;
}

export default function TaskPane({ tasks, projects, domains, curDomain, curProjId, selTaskId, onSelectTask, onToggleDone, onAddTask, onUpdateTask, onDeleteTask }: Props) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(todayDue());
  const [urgent, setUrgent] = useState(false);
  const [projId, setProjId] = useState<string>("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTaskId) editRef.current?.focus(); }, [editingTaskId]);

  const startEdit = (task: Task) => { setEditingTaskId(task.id); setEditingTitle(task.title); };
  const confirmEdit = (id: string) => {
    if (editingTitle.trim()) onUpdateTask(id, { title: editingTitle.trim() });
    setEditingTaskId(null);
  };
  const cancelEdit = () => setEditingTaskId(null);

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // Determine which projects are selectable in the add form
  const selectableProjects = useMemo(() => {
    if (curProjId) return projects.filter((p) => p.id === curProjId);
    if (curDomain !== "all") return projects.filter((p) => p.domain === curDomain);
    return projects;
  }, [projects, curDomain, curProjId]);

  useEffect(() => {
    if (adding) {
      const defaultProj = curProjId ?? selectableProjects[0]?.id ?? "";
      setProjId(defaultProj);
      setDue(todayDue());
      setUrgent(false);
      setTitle("");
      inputRef.current?.focus();
    }
  }, [adding]);

  const confirmAdd = () => {
    if (title.trim() && projId) {
      onAddTask(title.trim(), projId, due, urgent);
      setTitle("");
      setDue(todayDue());
      setUrgent(false);
      setAdding(false);
    }
  };

  const cancelAdd = () => {
    setTitle("");
    setAdding(false);
  };

  const visibleTasks = useMemo(() => {
    let filtered: Task[];
    if (curProjId) filtered = tasks.filter((t) => t.projId === curProjId);
    else if (curDomain !== "all") filtered = tasks.filter((t) => projMap.get(t.projId)?.domain === curDomain);
    else filtered = tasks;
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

    return (
      <div
        key={task.id}
        onClick={() => !isEditing && onSelectTask(task.id)}
        onMouseEnter={() => setHoveredTaskId(task.id)}
        onMouseLeave={() => setHoveredTaskId(null)}
        style={{ ...styles.taskRow, background: isSelected ? "var(--color-info-bg)" : hoveredTaskId === task.id ? "var(--color-bg-secondary)" : "transparent" }}
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
            <input
              ref={editRef}
              style={styles.editInput}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) confirmEdit(task.id);
                if (e.key === "Escape") cancelEdit();
              }}
              onBlur={() => confirmEdit(task.id)}
            />
          ) : (
            <div style={{ fontSize: 12.5, color: task.done ? "var(--color-text-tertiary)" : "var(--color-text-primary)", textDecoration: task.done ? "line-through" : "none", lineHeight: 1.4 }}>
              {task.title}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
            {task.urgent && !task.done && <span style={{ ...styles.chip, background: "#FCEBEB", color: "#A32D2D", border: "none" }}>急ぎ</span>}
            <span style={styles.chip}>{task.due}</span>
            {proj && <span style={{ ...styles.chip, background: domColor.bg, color: domColor.color, border: "none" }}>{proj.name}</span>}
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
              type="text"
              style={{ ...styles.input, marginBottom: 0, width: 80 }}
              placeholder="MM/DD"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              急ぎ
            </label>
          </div>
          {!curProjId && (
            <select style={{ ...styles.input, marginBottom: 6 }} value={projId} onChange={(e) => setProjId(e.target.value)}>
              {selectableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <button style={styles.confirmBtn} onClick={confirmAdd}>追加</button>
            <button style={styles.cancelBtn} onClick={cancelAdd}>キャンセル</button>
          </div>
        </div>
      );
    } else {
      rows.push(
        <button key="add-btn" style={styles.addBtn} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" aria-hidden="true" />
          タスクを追加
        </button>
      );
    }

    return rows;
  };

  const renderFocusCards = () => {
    // 今日のフォーカスは常に未完了タスクのみを対象とする（showDone の状態に依存しない）
    const undoneTasks = visibleTasks.filter((t) => !t.done);
    const top3 = scoredFocus(undoneTasks);
    if (!top3.length) return <div style={styles.empty}>対象タスクがありません</div>;
    return top3.map((task, i) => {
      const proj = projMap.get(task.projId);
      const rank = RANK_STYLES[i];
      return (
        <div key={task.id} onClick={() => onSelectTask(task.id)} style={styles.focusCard}>
          <div style={{ ...styles.focusHeader, background: rank.bg, color: rank.color }}>
            <i className="ti ti-flame" aria-hidden="true" />
            {rank.label}
          </div>
          <div style={styles.focusBody}>
            <span style={{ fontSize: 12.5 }}>{task.title}</span>
            <br />
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {proj?.name} · {task.due}{task.urgent ? " · 急ぎ" : ""}
            </span>
          </div>
        </div>
      );
    });
  };

  return (
    <div style={styles.pane}>

      {/* ── ペインヘッダー ── */}
      <div style={styles.paneHeader}>タスク管理</div>

      {/* ── 上段: 今日のフォーカス ── */}
      <div style={styles.focusSection}>
        <div style={styles.sectionHeader}>
          <i className="ti ti-sparkles" style={{ fontSize: 11, marginRight: 5 }} aria-hidden="true" />
          今日のフォーカス
          <span style={{ marginLeft: 6, fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>AIが優先度を分析</span>
        </div>
        <div style={styles.focusScroll}>
          {renderFocusCards()}
        </div>
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
  chip: { fontSize: 10, padding: "1px 6px", borderRadius: 4, border: "0.5px solid var(--color-border)", color: "var(--color-text-secondary)", background: "transparent" },
  sectionLabel: { padding: "6px 12px", fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)" },
  progressBar: { height: 3, background: "var(--color-bg-secondary)", borderRadius: 2, margin: "8px 12px" },
  progressFill: { height: "100%", borderRadius: 2, background: "var(--color-dot-green)", transition: "width 0.3s ease" },
  empty: { padding: "20px 12px", fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", border: "none", borderBottom: "0.5px solid var(--color-border)", width: "100%", textAlign: "left", fontSize: 12, cursor: "pointer", color: "var(--color-text-tertiary)", background: "transparent" },
  addForm: { padding: "8px 10px", borderBottom: "0.5px solid var(--color-border)", background: "var(--color-bg-secondary)" },
  input: { width: "100%", padding: "5px 8px", fontSize: 12, border: "0.5px solid var(--color-border-mid)", borderRadius: 6, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", marginBottom: 6, fontFamily: "inherit" },
  confirmBtn: { flex: 1, padding: "4px 8px", fontSize: 11, fontWeight: 500, border: "0.5px solid var(--color-border-mid)", borderRadius: 5, background: "var(--color-info-bg)", color: "var(--color-info-text)", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "4px 8px", fontSize: 11, border: "0.5px solid var(--color-border)", borderRadius: 5, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" },
  focusCard: { flex: "1 1 0", minWidth: 0, borderRadius: 8, border: "0.5px solid var(--color-border)", overflow: "hidden", cursor: "pointer" },
  focusHeader: { padding: "7px 12px", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 },
  focusBody: { padding: "7px 12px", borderTop: "0.5px solid var(--color-border)", background: "var(--color-bg)" },
};
