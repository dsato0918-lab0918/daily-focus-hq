import { Client } from "@notionhq/client";
import type { Project, Task } from "./types";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const PROJECTS_DB = process.env.NOTION_PROJECTS_DB_ID!;
const TASKS_DB    = process.env.NOTION_TASKS_DB_ID!;

// ── ページプロパティのヘルパー ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getText(prop: any): string {
  if (!prop) return "";
  if (prop.type === "title")     return prop.title?.map((t: any) => t.plain_text).join("") ?? "";
  if (prop.type === "rich_text") return prop.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSelect(prop: any): string {
  return prop?.select?.name ?? "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCheck(prop: any): boolean {
  return prop?.checkbox ?? false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRelationIds(prop: any): string[] {
  return prop?.relation?.map((r: any) => r.id) ?? [];
}

// ── プロジェクト変換 ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pageToProject(page: any): Project {
  const p = page.properties;
  return {
    id:       page.id,
    name:     getText(p["名前"]),
    domain:   getSelect(p["セクション"]) || "design",
    status:   (getSelect(p["ステータス"]) || "g") as "g" | "a" | "r",
    archived: getCheck(p["アーカイブ"]),
  };
}

// ── タスク変換 ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pageToTask(page: any): Task {
  const p = page.properties;
  const projIds = getRelationIds(p["プロジェクト"]);
  return {
    id:             page.id,
    projId:         projIds[0] ?? "",
    title:          getText(p["タイトル"]),
    due:            getText(p["期日"]),
    urgent:         getCheck(p["急ぎ"]),
    done:           getCheck(p["完了"]),
    memo:           getText(p["メモ"]),
    staffRequested: getCheck(p["スタッフ依頼済"]),
    vendorRequested:getCheck(p["業者依頼済"]),
  };
}

// ── 全データ取得 ─────────────────────────────────────────────

export async function fetchAllProjects(): Promise<Project[]> {
  const results: Project[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.databases.query({
      database_id: PROJECTS_DB,
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    for (const page of res.results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.push(pageToProject(page as any));
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results;
}

export async function fetchAllTasks(): Promise<Task[]> {
  const results: Task[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.databases.query({
      database_id: TASKS_DB,
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    for (const page of res.results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.push(pageToTask(page as any));
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results;
}

// ── プロジェクト CRUD ────────────────────────────────────────

export async function createProject(data: Omit<Project, "id">): Promise<Project> {
  const page = await notion.pages.create({
    parent: { database_id: PROJECTS_DB },
    properties: {
      "名前":     { title: [{ text: { content: data.name } }] },
      "セクション": { select: { name: data.domain } },
      "ステータス": { select: { name: data.status } },
      "アーカイブ": { checkbox: data.archived ?? false },
    },
  });
  return pageToProject(page);
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {};
  if (data.name     !== undefined) props["名前"]     = { title: [{ text: { content: data.name } }] };
  if (data.domain   !== undefined) props["セクション"] = { select: { name: data.domain } };
  if (data.status   !== undefined) props["ステータス"] = { select: { name: data.status } };
  if (data.archived !== undefined) props["アーカイブ"] = { checkbox: data.archived };
  await notion.pages.update({ page_id: id, properties: props });
}

export async function deleteProject(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}

// ── タスク CRUD ──────────────────────────────────────────────

export async function createTask(data: Omit<Task, "id">): Promise<Task> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {
    "タイトル":     { title: [{ text: { content: data.title } }] },
    "期日":         { rich_text: [{ text: { content: data.due } }] },
    "急ぎ":         { checkbox: data.urgent },
    "完了":         { checkbox: data.done },
    "メモ":         { rich_text: [{ text: { content: data.memo } }] },
    "スタッフ依頼済": { checkbox: data.staffRequested ?? false },
    "業者依頼済":   { checkbox: data.vendorRequested ?? false },
  };
  if (data.projId) {
    props["プロジェクト"] = { relation: [{ id: data.projId }] };
  }
  const page = await notion.pages.create({
    parent: { database_id: TASKS_DB },
    properties: props,
  });
  return pageToTask(page);
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {};
  if (data.title          !== undefined) props["タイトル"]     = { title: [{ text: { content: data.title } }] };
  if (data.due            !== undefined) props["期日"]         = { rich_text: [{ text: { content: data.due } }] };
  if (data.urgent         !== undefined) props["急ぎ"]         = { checkbox: data.urgent };
  if (data.done           !== undefined) props["完了"]         = { checkbox: data.done };
  if (data.memo           !== undefined) props["メモ"]         = { rich_text: [{ text: { content: data.memo } }] };
  if (data.staffRequested !== undefined) props["スタッフ依頼済"] = { checkbox: data.staffRequested };
  if (data.vendorRequested!== undefined) props["業者依頼済"]   = { checkbox: data.vendorRequested };
  if (data.projId         !== undefined) props["プロジェクト"] = { relation: [{ id: data.projId }] };
  await notion.pages.update({ page_id: id, properties: props });
}

export async function deleteTask(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}
