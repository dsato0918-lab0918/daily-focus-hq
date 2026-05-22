"use client";

import { useState, useRef, useEffect } from "react";
import type { Domain, DomainKey, Project } from "@/lib/types";

interface Props {
  domains: Domain[];
  projects: Project[];
  curDomain: DomainKey;
  onSelect: (domain: DomainKey) => void;
  onAddDomain: (name: string) => void;
  onUpdateDomain: (id: string, label: string) => void;
  onDeleteDomain: (id: string) => void;
}

export default function DomainPane({ domains, projects, curDomain, onSelect, onAddDomain, onUpdateDomain, onDeleteDomain }: Props) {
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);
  useEffect(() => { if (editingId) editRef.current?.focus(); }, [editingId]);

  // セクションにはアクティブ（非アーカイブ）なプロジェクト数を表示
  const countProjects = (id: DomainKey | "all") =>
    projects.filter((p) => !p.archived && (id === "all" || p.domain === id)).length;

  const startEdit = (d: Domain) => { setEditingId(d.id); setEditValue(d.label); };
  const confirmEdit = () => {
    if (editingId && editValue.trim()) onUpdateDomain(editingId, editValue.trim());
    setEditingId(null);
  };
  const confirmAdd = () => {
    if (addName.trim()) { onAddDomain(addName.trim()); setAddName(""); setAdding(false); }
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) { onDeleteDomain(id); setConfirmDeleteId(null); }
    else { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId(null), 3000); }
  };

  return (
    <aside style={s.pane}>
      <div style={s.header}>セクション</div>

      {/* 全体俯瞰（固定） */}
      <div
        style={{ ...s.row, background: curDomain === "all" ? "var(--color-info-bg)" : "transparent" }}
        onClick={() => onSelect("all")}
        onMouseEnter={() => setHoveredId("all")}
        onMouseLeave={() => setHoveredId(null)}
      >
        <span style={{ ...s.icon, background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>
          <i className="ti ti-layout-grid" aria-hidden="true" />
        </span>
        <span style={{ ...s.label, color: curDomain === "all" ? "var(--color-info-text)" : "var(--color-text-primary)", fontWeight: curDomain === "all" ? 500 : 400 }}>全体俯瞰</span>
        <span style={{ ...s.badge, background: curDomain === "all" ? "rgba(0,0,0,0.08)" : "var(--color-bg-secondary)", color: curDomain === "all" ? "var(--color-info-text)" : "var(--color-text-tertiary)" }}>{countProjects("all")}</span>
      </div>

      {/* ユーザー定義の大分野 */}
      {domains.map((d) => {
        const isActive = curDomain === d.id;
        const isHovered = hoveredId === d.id;
        const isEditing = editingId === d.id;
        const isConfirmingDelete = confirmDeleteId === d.id;

        return (
          <div
            key={d.id}
            style={{ ...s.row, background: isActive ? "var(--color-info-bg)" : isHovered ? "var(--color-bg-secondary)" : "transparent" }}
            onClick={() => !isEditing && onSelect(d.id)}
            onMouseEnter={() => setHoveredId(d.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <span style={{ ...s.icon, background: d.bgColor, color: d.textColor }}>
              <i className={`ti ${d.icon}`} aria-hidden="true" />
            </span>

            {isEditing ? (
              <input
                ref={editRef}
                style={s.inlineInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={confirmEdit}
              />
            ) : (
              <span style={{ ...s.label, flex: 1, color: isActive ? "var(--color-info-text)" : "var(--color-text-primary)", fontWeight: isActive ? 500 : 400 }}>{d.label}</span>
            )}

            {!isEditing && isHovered ? (
              <div style={s.actions} onClick={(e) => e.stopPropagation()}>
                <button style={s.iconBtn} onClick={() => startEdit(d)} title="名称を編集">
                  <i className="ti ti-pencil" />
                </button>
                <button
                  style={{ ...s.iconBtn, color: isConfirmingDelete ? "#E24B4A" : undefined }}
                  onClick={() => handleDelete(d.id)}
                  title={isConfirmingDelete ? "もう一度クリックで削除" : "削除"}
                >
                  <i className={isConfirmingDelete ? "ti ti-alert-triangle" : "ti ti-trash"} />
                </button>
              </div>
            ) : !isEditing ? (
              <span style={{ ...s.badge, background: isActive ? "rgba(0,0,0,0.08)" : "var(--color-bg-secondary)", color: isActive ? "var(--color-info-text)" : "var(--color-text-tertiary)" }}>{countProjects(d.id)}</span>
            ) : null}
          </div>
        );
      })}

      {/* 追加フォーム */}
      {adding ? (
        <div style={s.addForm}>
          <input ref={addRef} style={s.input} placeholder="セクション名..." value={addName} onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") { setAdding(false); setAddName(""); } }} />
          <div style={s.formActions}>
            <button style={s.confirmBtn} onClick={confirmAdd}>追加</button>
            <button style={s.cancelBtn} onClick={() => { setAdding(false); setAddName(""); }}>キャンセル</button>
          </div>
        </div>
      ) : (
        <button style={s.addBtn} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" aria-hidden="true" /> セクションを追加
        </button>
      )}
    </aside>
  );
}

const s: Record<string, React.CSSProperties> = {
  pane: { display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border)", background: "var(--color-bg)", overflowY: "auto" },
  header: { padding: "10px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)", borderBottom: "0.5px solid var(--color-border)", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "0.5px solid var(--color-border)", cursor: "pointer", minHeight: 38 },
  icon: { width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 },
  label: { fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badge: { fontSize: 10, borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center", flexShrink: 0 },
  actions: { display: "flex", gap: 2, flexShrink: 0 },
  iconBtn: { width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--color-text-tertiary)", padding: 0 },
  inlineInput: { flex: 1, padding: "2px 6px", fontSize: 13, border: "0.5px solid var(--color-border-mid)", borderRadius: 4, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", border: "none", borderBottom: "0.5px solid var(--color-border)", width: "100%", textAlign: "left", fontSize: 12, cursor: "pointer", color: "var(--color-text-tertiary)", background: "transparent" },
  addForm: { padding: "8px 10px", borderBottom: "0.5px solid var(--color-border)", background: "var(--color-bg-secondary)" },
  input: { width: "100%", padding: "5px 8px", fontSize: 12, border: "0.5px solid var(--color-border-mid)", borderRadius: 6, background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", marginBottom: 6, fontFamily: "inherit" },
  formActions: { display: "flex", gap: 4 },
  confirmBtn: { flex: 1, padding: "4px 8px", fontSize: 11, fontWeight: 500, border: "0.5px solid var(--color-border-mid)", borderRadius: 5, background: "var(--color-info-bg)", color: "var(--color-info-text)", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "4px 8px", fontSize: 11, border: "0.5px solid var(--color-border)", borderRadius: 5, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" },
};
