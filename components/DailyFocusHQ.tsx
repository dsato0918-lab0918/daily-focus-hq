"use client";

import { useState, useCallback, useMemo } from "react";
import { initialDomains, initialProjects, initialTasks, DOMAIN_COLOR_PRESETS, DOMAIN_ICONS } from "@/lib/data";
import type { Domain, DomainKey, Project, Task } from "@/lib/types";
import DomainPane from "./DomainPane";
import ProjectPane from "./ProjectPane";
import TaskPane from "./TaskPane";
import DetailPane from "./DetailPane";
import FloatingAIChat from "./FloatingAIChat";

export default function DailyFocusHQ() {
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [curDomain, setCurDomain] = useState<DomainKey>("all");
  const [curProjId, setCurProjId] = useState<string | null>(null);
  const [selTaskId, setSelTaskId] = useState<string | null>(null);

  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const selTask = useMemo(() => tasks.find((t) => t.id === selTaskId) ?? null, [tasks, selTaskId]);
  const selProject = useMemo(() => (selTask ? projMap.get(selTask.projId) ?? null : null), [selTask, projMap]);

  // ── 選択系 ────────────────────────────────────────────────────
  const handleSelectDomain = useCallback((domain: DomainKey) => {
    setCurDomain(domain); setCurProjId(null); setSelTaskId(null);
  }, []);
  const handleSelectProj = useCallback((projId: string | null) => {
    setCurProjId(projId); setSelTaskId(null);
  }, []);
  const handleSelectTask = useCallback((id: string) => setSelTaskId(id), []);

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
  }, []);
  const handleUpdateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);
  const handleDeleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelTaskId((cur) => (cur === id ? null : cur));
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

  // ── 大分野操作 ────────────────────────────────────────────────
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

  return (
    <div style={styles.container}>
      <DomainPane
        domains={domains} tasks={tasks} projects={projects}
        curDomain={curDomain}
        onSelect={handleSelectDomain}
        onAddDomain={handleAddDomain}
        onUpdateDomain={handleUpdateDomain}
        onDeleteDomain={handleDeleteDomain}
      />
      <ProjectPane
        domains={domains} projects={projects}
        curDomain={curDomain} curProjId={curProjId}
        onSelect={handleSelectProj}
        onAddProject={handleAddProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
      />
      <TaskPane
        tasks={tasks} projects={projects} domains={domains}
        curDomain={curDomain} curProjId={curProjId} selTaskId={selTaskId}
        onSelectTask={handleSelectTask}
        onToggleDone={handleToggleDone}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
      />
      <DetailPane
        task={selTask} project={selProject}
        onMemoChange={handleMemoChange}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
      <FloatingAIChat />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "grid",
    gridTemplateColumns: "180px 200px minmax(0, 1fr) 260px",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "var(--color-bg)",
  },
};
