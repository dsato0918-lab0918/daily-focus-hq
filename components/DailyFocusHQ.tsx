"use client";

import { useState, useCallback, useMemo } from "react";
import { initialDomains, initialProjects, initialTasks, DOMAIN_COLOR_PRESETS, DOMAIN_ICONS } from "@/lib/data";
import type { Domain, DomainKey, Project, Task } from "@/lib/types";
import DomainPane from "./DomainPane";
import ProjectPane from "./ProjectPane";
import TaskPane from "./TaskPane";
import DetailPane from "./DetailPane";
import FloatingAIChat from "./FloatingAIChat";

type MobilePane = "nav" | "tasks" | "detail";

const MOBILE_NAV_ITEMS = [
  { key: "nav"    as MobilePane, icon: "ti-layout-grid", label: "ナビ"   },
  { key: "tasks"  as MobilePane, icon: "ti-checkbox",    label: "タスク" },
  { key: "detail" as MobilePane, icon: "ti-file-text",   label: "詳細"   },
];

const isMobileWidth = () =>
  typeof window !== "undefined" && window.innerWidth < 768;

export default function DailyFocusHQ() {
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [curDomain, setCurDomain] = useState<DomainKey>("all");
  const [curProjId, setCurProjId] = useState<string | null>(null);
  const [selTaskId, setSelTaskId] = useState<string | null>(null);

  // モバイルのアクティブペイン
  const [activeMobilePane, setActiveMobilePane] = useState<MobilePane>("tasks");

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const selTask = useMemo(() => tasks.find((t) => t.id === selTaskId) ?? null, [tasks, selTaskId]);
  const selProject = useMemo(() => (selTask ? projMap.get(selTask.projId) ?? null : null), [selTask, projMap]);

  // ── 選択系 ────────────────────────────────────────────────────
  const handleSelectDomain = useCallback((domain: DomainKey) => {
    setCurDomain(domain); setCurProjId(null); setSelTaskId(null);
    if (isMobileWidth()) setActiveMobilePane("tasks");
  }, []);

  const handleSelectProj = useCallback((projId: string | null) => {
    setCurProjId(projId); setSelTaskId(null);
    if (projId && isMobileWidth()) setActiveMobilePane("tasks");
  }, []);

  const handleSelectTask = useCallback((id: string) => {
    setSelTaskId(id);
    if (isMobileWidth()) setActiveMobilePane("detail");
  }, []);

  // ── タスク操作 ────────────────────────────────────────────────
  const handleToggleDone = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);
  const handleMemoChange = useCallback((id: string, memo: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, memo } : t)));
  }, []);
  const handleAddTask = useCallback((title: string, projId: string, due: string, urgent: boolean) => {
    const newTask: Task = { id: `task_${Date.now()}`, projId, title, due, urgent, done: false, memo: "" };
    setTasks((prev) => [...prev, newTask]);
    setSelTaskId(newTask.id);
    if (isMobileWidth()) setActiveMobilePane("detail");
  }, []);
  const handleUpdateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);
  const handleDeleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelTaskId((cur) => (cur === id ? null : cur));
    if (isMobileWidth()) setActiveMobilePane("tasks");
  }, []);

  // ── プロジェクト操作 ──────────────────────────────────────────
  const handleAddProject = useCallback((name: string, domain: DomainKey) => {
    setProjects((prev) => [...prev, { id: `proj_${Date.now()}`, domain, name, status: "g" }]);
  }, []);
  const handleUpdateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);
  const handleDeleteProject = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.projId !== id));
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setCurProjId((cur) => (cur === id ? null : cur));
    setSelTaskId(null);
  }, []);

  // ── セクション操作 ────────────────────────────────────────────
  const handleAddDomain = useCallback((name: string) => {
    setDomains((prev) => {
      const preset = DOMAIN_COLOR_PRESETS[prev.length % DOMAIN_COLOR_PRESETS.length];
      const icon = DOMAIN_ICONS[(prev.length + 3) % DOMAIN_ICONS.length];
      return [...prev, { id: `domain_${Date.now()}`, label: name, icon, bgColor: preset.bgColor, textColor: preset.textColor }];
    });
  }, []);
  const handleUpdateDomain = useCallback((id: string, label: string) => {
    setDomains((prev) => prev.map((d) => (d.id === id ? { ...d, label } : d)));
  }, []);
  const handleDeleteDomain = useCallback((id: string) => {
    const projIds = projects.filter((p) => p.domain === id).map((p) => p.id);
    setTasks((prev) => prev.filter((t) => !projIds.includes(t.projId)));
    setProjects((prev) => prev.filter((p) => p.domain !== id));
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setCurDomain((cur) => (cur === id ? "all" : cur));
    setCurProjId(null);
    setSelTaskId(null);
  }, [projects]);

  // ── 共通 props ───────────────────────────────────────────────
  const domainProps = {
    domains, tasks, projects, curDomain,
    onSelect: handleSelectDomain,
    onAddDomain: handleAddDomain,
    onUpdateDomain: handleUpdateDomain,
    onDeleteDomain: handleDeleteDomain,
  };
  const projectProps = {
    domains, projects, curDomain, curProjId,
    onSelect: handleSelectProj,
    onAddProject: handleAddProject,
    onUpdateProject: handleUpdateProject,
    onDeleteProject: handleDeleteProject,
  };
  const taskProps = {
    tasks, projects, domains, curDomain, curProjId, selTaskId,
    onSelectTask: handleSelectTask,
    onToggleDone: handleToggleDone,
    onAddTask: handleAddTask,
    onDeleteTask: handleDeleteTask,
  };
  const detailProps = {
    task: selTask, project: selProject,
    onMemoChange: handleMemoChange,
    onUpdateTask: handleUpdateTask,
    onDeleteTask: handleDeleteTask,
  };

  return (
    <>
      {/* ════════════════════════════════════════
          デスクトップレイアウト（変更なし）
          CSS: .desktop-layout → 768px以下で display:none
      ════════════════════════════════════════ */}
      <div className="desktop-layout" style={styles.desktopContainer}>
        <DomainPane  {...domainProps}  />
        <ProjectPane {...projectProps} />
        <TaskPane    {...taskProps}    />
        <DetailPane  {...detailProps}  />
      </div>

      {/* ════════════════════════════════════════
          モバイルレイアウト（768px以下で表示）
          CSS: .mobile-layout → 768px以上で display:none
      ════════════════════════════════════════ */}
      <div className="mobile-layout">

        {/* メインコンテンツエリア */}
        <div className="mobile-content">
          {activeMobilePane === "nav" && (
            <div className="mobile-nav-pane">
              <div className="mobile-nav-domain">
                <DomainPane {...domainProps} />
              </div>
              <div className="mobile-nav-project">
                <ProjectPane {...projectProps} />
              </div>
            </div>
          )}
          {activeMobilePane === "tasks" && <TaskPane {...taskProps} />}
          {activeMobilePane === "detail" && <DetailPane {...detailProps} />}
        </div>

        {/* ボトムナビゲーション */}
        <nav className="mobile-bottom-nav">
          {MOBILE_NAV_ITEMS.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`mobile-nav-btn${activeMobilePane === key ? " active" : ""}`}
              onClick={() => setActiveMobilePane(key)}
            >
              <i className={`ti ${icon}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <FloatingAIChat tasks={tasks} projects={projects} domains={domains} />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  desktopContainer: {
    gridTemplateColumns: "180px 200px minmax(0, 1fr) 260px",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "var(--color-bg)",
  },
};
