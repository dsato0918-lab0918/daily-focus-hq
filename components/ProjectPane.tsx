"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Domain, DomainKey, Project, Task } from "@/lib/types";

interface Props {
  domains: Domain[];
  projects: Project[];
  tasks: Task[];
  curDomain: DomainKey;
  curProjId: string | null;
  onSelect: (projId: string | null) => void;
  onAddProject: (name: string, domain: DomainKey) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onReorderProjects: (fromId: string, toId: string) => void;
}

const STATUS_COLORS: Record<Project["status"], string> = {
  g: "var(--color-dot-green)",
  a: "var(--color-dot-amber)",
  r: "var(--color-dot-red)",
};
const STATUS_LABELS: Record<Project["status"], string> = { g: "順調", a: "注意", r: "遅延" };

export default function ProjectPane({
  domains, projects, tasks, curDomain, curProjId,
  onSelect, onAddProject, onUpdateProject, onDeleteProject,
  onArchiveProject, onRestoreProject, onReorderProjects,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDomainId, setAddDomainId] = useState<DomainKey>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // ドラッグ&ドロップ
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragAtEnd, setDragAtEnd] = useState(false);
  const lastDragEndMs = useRef(0);
  const addRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) { setAddDomainId(curDomain !== "all" ? curDomain : (domains[0]?.id ?? "")); addRef.current?.focus(); }
  }, [adding, curDomain, domains]);
  useEffect(() => { if (editingId) editRef.current?.focus(); }, [editingId]);

  // ドメインIDからドメインを引くマップ
  const domainMap = useMemo(() => new Map(domains.map((d) => [d.id, d])), [domains]);

  // プロジェクトIDごとの未完了タスク数
  const taskCountMap = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (!t.done) map.set(t.projId, (map.get(t.projId) ?? 0) + 1);
    });
    return map;
  }, [tasks]);

  // アクティブ / アーカイブ済みを分離
  const activeProjects   = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const archivedProjects = useMemo(() => projects.filter((p) =>  p.archived), [projects]);

  // 表示対象（セクションフィルタ適用）
  const visibleActive = useMemo(() =>
    curDomain === "all" ? activeProjects : activeProjects.filter((p) => p.domain === curDomain),
    [activeProjects, curDomain]);

  const visibleArchived = useMemo(() =>
    curDomain === "all" ? archivedProjects : archivedProjects.filter((p) => p.domain === curDomain),
    [archivedProjects, curDomain]);

  const startEdit = (p: Project) => { setEditingId(p.id); setEditValue(p.name); };
  const confirmEdit = () => {
    if (editingId && editValue.trim()) onUpdateProject(editingId, { name: editValue.trim() });
    setEditingId(null);
  };
  const confirmAdd = () => {
    if (addName.trim() && addDomainId) { onAddProject(addName.trim(), addDomainId); setAddName(""); setAdding(false); }
  };
  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) { onDeleteProject(id); setConfirmDeleteId(null); }
    else { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId(null), 3000); }
  };

  // アクティブなプロジェクト行
  const renderProject = (proj: Project) => {
    const isActive   = curProjId === proj.id;
    const isHovered  = hoveredId === proj.id;
    const isEditing  = editingId === proj.id;
    const isConfirmingDelete = confirmDeleteId === proj.id;
    const taskCount  = taskCountMap.get(proj.id) ?? 0;
    const isDragging = dragId === proj.id;
    const isDragOver = dragOverId === proj.id && !dragAtEnd;

    return (
      <div
        key={proj.id}
        draggable={!isEditing}
        onDragStart={(e) => {
          setDragId(proj.id);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", proj.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (dragOverId !== proj.id) setDragOverId(proj.id);
          setDragAtEnd(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && dragId !== proj.id) onReorderProjects(dragId, proj.id);
          setDragId(null); setDragOverId(null); setDragAtEnd(false);
        }}
        onDragEnd={() => {
          lastDragEndMs.current = Date.now();
          setDragId(null); setDragOverId(null); setDragAtEnd(false);
        }}
        style={{
          ...s.row,
          background: isActive ? "var(--color-info-bg)" : isHovered ? "var(--color-bg-secondary)" : "transparent",
          opacity: isDragging ? 0.4 : 1,
          borderTop: isDragOver ? "2px solid var(--color-info-text)" : "2px solid transparent",
        }}
        onClick={() => {
          if (Date.now() - lastDragEndMs.current < 200) return;
          if (!isEditing) onSelect(isActive ? null : proj.id);
        }}
        onMouseEnter={() => setHoveredId(proj.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* グリップハンドル */}
        <i className="ti ti-grip-vertical"
          style={{ cursor: isDragging ? "grabbing" : "grab", color: "var(--color-text-tertiary)", fontSize: 11, flexShrink: 0, opacity: isHovered || isDragging ? 0.6 : 0, transition: "opacity 0.15s" }}
        />

        {/* ステータスドット（ホバー時はステータス変更ボタンに） */}
        {isHovered && !isEditing ? (
          <div style={s.statusBtns} onClick={(e) => e.stopPropagation()}>
            {(["g", "a", "r"] as Project["status"][]).map((st) => (
              <button key={st} title={STATUS_LABELS[st]}
                style={{ ...s.statusDot, background: STATUS_COLORS[st], opacity: proj.status === st ? 1 : 0.3 }}
                onClick={() => onUpdateProject(proj.id, { status: st })}
              />
            ))}
          </div>
        ) : (
          <span style={{ ...s.dot, background: STATUS_COLORS[proj.status] }} />
        )}

        {isEditing ? (
          <input ref={editRef} style={s.inlineInput} value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) confirmEdit(); if (e.key === "Escape") setEditingId(null); }}
            onBlur={confirmEdit}
          />
        ) : (
          <span style={{ fontSize: 12.5, flex: 1, color: isActive ? "var(--color-info-text)" : "var(--color-text-primary)", fontWeight: isActive ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {proj.name}
          </span>
        )}

        {!isEditing && isHovered ? (
          <div style={s.actions} onClick={(e) => e.stopPropagation()}>
            <button style={s.iconBtn} onClick={() => startEdit(proj)} title="名称を編集">
              <i className="ti ti-pencil" />
            </button>
            <button style={s.iconBtn} onClick={() => onArchiveProject(proj.id)} title="アーカイブ">
              <i className="ti ti-archive" />
            </button>
            <button style={{ ...s.iconBtn, color: isConfirmingDelete ? "#E24B4A" : undefined }}
              onClick={() => handleDelete(proj.id)} title={isConfirmingDelete ? "もう一度クリックで削除" : "削除"}>
              <i className={isConfirmingDelete ? "ti ti-alert-triangle" : "ti ti-trash"} />
            </button>
          </div>
        ) : !isEditing ? (
          <span style={{ ...s.badge, background: isActive ? "rgba(0,0,0,0.08)" : "var(--color-bg-secondary)", color: isActive ? "var(--color-info-text)" : "var(--color-text-tertiary)" }}>
            {taskCount}
          </span>
        ) : null}
      </div>
    );
  };

  // アーカイブ済みプロジェクト行
  const renderArchivedProject = (proj: Project) => {
    const domain = domainMap.get(proj.domain);
    const isConfirmingDelete = confirmDeleteId === proj.id;

    return (
      <div
        key={proj.id}
        style={{ ...s.row, opacity: 0.72, cursor: "default" }}
        onMouseEnter={() => setHoveredId(proj.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* ドメインタグ */}
        {domain && (
          <span style={{ ...s.domainTag, background: domain.bgColor, color: domain.textColor }}>
            {domain.label}
          </span>
        )}

        <span style={{ fontSize: 12.5, flex: 1, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {proj.name}
        </span>

        <div style={s.actions} onClick={(e) => e.stopPropagation()}>
          <button style={{ ...s.iconBtn, color: "var(--color-info-text)" }} onClick={() => onRestoreProject(proj.id)} title="アクティブに戻す">
            <i className="ti ti-restore" />
          </button>
          <button style={{ ...s.iconBtn, color: isConfirmingDelete ? "#E24B4A" : undefined }}
            onClick={() => handleDelete(proj.id)} title={isConfirmingDelete ? "もう一度クリックで削除" : "削除"}>
            <i className={isConfirmingDelete ? "ti ti-alert-triangle" : "ti ti-trash"} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={s.pane}>
      <div style={s.header}>プロジェクト</div>

      {/* ── アクティブなプロジェクト ── */}
      {curDomain === "all"
        ? domains.map((d) => {
            const filtered = visibleActive.filter((p) => p.domain === d.id);
            if (!filtered.length) return null;
            return <div key={d.id}><div style={s.sectionLabel}>{d.label}</div>{filtered.map(renderProject)}</div>;
          })
        : visibleActive.map(renderProject)}

      {/* ── 末尾ドロップゾーン ── */}
      {dragId && (
        <div
          style={{ height: 10, borderTop: dragAtEnd ? "2px solid var(--color-info-text)" : "2px solid transparent", transition: "border-top 0.1s" }}
          onDragOver={(e) => { e.preventDefault(); setDragAtEnd(true); setDragOverId(null); }}
          onDragLeave={() => setDragAtEnd(false)}
          onDrop={(e) => { e.preventDefault(); if (dragId) onReorderProjects(dragId, "__END__"); setDragId(null); setDragAtEnd(false); }}
        />
      )}

      {/* ── 追加フォーム / ボタン ── */}
      {adding ? (
        <div style={s.addForm}>
          <input ref={addRef} style={s.input} placeholder="プロジェクト名..." value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) confirmAdd(); if (e.key === "Escape") { setAdding(false); setAddName(""); } }} />
          {curDomain === "all" && (
            <select style={{ ...s.input, marginBottom: 6 }} value={addDomainId} onChange={(e) => setAddDomainId(e.target.value)}>
              {domains.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          )}
          <div style={s.formActions}>
            <button style={s.confirmBtn} onClick={confirmAdd}>追加</button>
            <button style={s.cancelBtn} onClick={() => { setAdding(false); setAddName(""); }}>キャンセル</button>
          </div>
        </div>
      ) : (
        <button style={s.addBtn} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" aria-hidden="true" /> プロジェクトを追加
        </button>
      )}

      {/* ── アーカイブ済みセクション ── */}
      {visibleArchived.length > 0 && (
        <div style={{ marginTop: "auto" }}>
          <button
            style={s.archiveToggle}
            onClick={() => setShowArchived((v) => !v)}
          >
            <i className={`ti ${showArchived ? "ti-chevron-down" : "ti-chevron-right"}`} style={{ fontSize: 11 }} />
            アーカイブ済み（{visibleArchived.length}件）
          </button>
          {showArchived && (
            <div style={{ borderTop: "0.5px solid var(--color-border)" }}>
              {visibleArchived.map(renderArchivedProject)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pane: { display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border)", background: "var(--color-bg)", overflowY: "auto", height: "100%" },
  header: { padding: "10px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 },
  sectionLabel: { padding: "6px 12px", fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)" },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: "0.5px solid var(--color-border)", cursor: "pointer", minHeight: 36 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  statusBtns: { display: "flex", gap: 3, flexShrink: 0 },
  statusDot: { width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, transition: "opacity 0.15s" },
  actions: { display: "flex", gap: 2, flexShrink: 0 },
  iconBtn: { width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--color-text-tertiary)", padding: 0 },
  inlineInput: { flex: 1, padding: "2px 6px", fontSize: 12.5, border: "0.5px solid var(--color-border-mid)", borderRadius: 4, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", border: "none", borderBottom: "0.5px solid var(--color-border)", width: "100%", textAlign: "left", fontSize: 12, cursor: "pointer", color: "var(--color-text-tertiary)", background: "transparent" },
  addForm: { padding: "8px 10px", borderBottom: "0.5px solid var(--color-border)", background: "var(--color-bg-secondary)" },
  input: { width: "100%", padding: "5px 8px", fontSize: 12, border: "0.5px solid var(--color-border-mid)", borderRadius: 6, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", marginBottom: 6, fontFamily: "inherit" },
  formActions: { display: "flex", gap: 4 },
  confirmBtn: { flex: 1, padding: "4px 8px", fontSize: 11, fontWeight: 500, border: "0.5px solid var(--color-border-mid)", borderRadius: 5, background: "var(--color-info-bg)", color: "var(--color-info-text)", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "4px 8px", fontSize: 11, border: "0.5px solid var(--color-border)", borderRadius: 5, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" },
  archiveToggle: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", border: "none", borderBottom: "0.5px solid var(--color-border)", borderTop: "0.5px solid var(--color-border)", width: "100%", textAlign: "left", fontSize: 11, cursor: "pointer", color: "var(--color-text-tertiary)", background: "var(--color-bg-secondary)" },
  domainTag: { fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap" as const },
  badge: { fontSize: 10, borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center" as const, flexShrink: 0 },
};
