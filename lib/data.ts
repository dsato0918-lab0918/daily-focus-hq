import type { Domain, Project, Task } from "./types";

export const initialDomains: Domain[] = [
  { id: "design", label: "設計",       icon: "ti-ruler-2",          bgColor: "#E6F1FB", textColor: "#185FA5" },
  { id: "const",  label: "施工",       icon: "ti-building-factory", bgColor: "#FAEEDA", textColor: "#854F0B" },
  { id: "mgmt",   label: "経営",       icon: "ti-chart-line",       bgColor: "#EAF3DE", textColor: "#3B6D11" },
  { id: "staff",  label: "スタッフ管理", icon: "ti-users",           bgColor: "#EEEDFE", textColor: "#3C3489" },
];

export const DOMAIN_COLOR_PRESETS = [
  { bgColor: "#E1F5EE", textColor: "#0F6E56" },
  { bgColor: "#FAECE7", textColor: "#993C1D" },
  { bgColor: "#FBEAF0", textColor: "#993556" },
  { bgColor: "#FCEBEB", textColor: "#A32D2D" },
  { bgColor: "#F1EFE8", textColor: "#5F5E5A" },
];

export const DOMAIN_ICONS = [
  "ti-layout-grid", "ti-briefcase", "ti-tool", "ti-home",
  "ti-calendar", "ti-file-text", "ti-star", "ti-truck",
];

export const initialProjects: Project[] = [];

export const initialTasks: Task[] = [];

export function todayDue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 翌日の日付を "YYYY-MM-DD" 形式で返す */
export function tomorrowDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → "M/D"、旧形式 "MM/DD" はそのまま返す */
export function formatDueDisplay(due: string): string {
  if (!due) return "";
  if (due.includes("-")) {
    const parts = due.split("-");
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  }
  return due;
}
