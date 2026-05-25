import type { Project, Task } from "./types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// ── Notion REST API 直接呼び出し ─────────────────────────────

async function notionFetch(
  path: string,
  method = "GET",
  body?: unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const token = process.env.NOTION_TOKEN;
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message ?? `Notion API error: ${res.status} ${path}`
    );
  }
  return res.json();
}

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
  const dbId = process.env.NOTION_PROJECTS_DB_ID;
  const results: Project[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/databases/${dbId}/query`, "POST", body);
    for (const page of res.results ?? []) {
      results.push(pageToProject(page));
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

export async function fetchAllTasks(): Promise<Task[]> {
  const dbId = process.env.NOTION_TASKS_DB_ID;
  const results: Task[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/databases/${dbId}/query`, "POST", body);
    for (const page of res.results ?? []) {
      results.push(pageToTask(page));
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

// ── プロジェクト CRUD ────────────────────────────────────────

export async function createProject(data: Omit<Project, "id">): Promise<Project> {
  const page = await notionFetch("/pages", "POST", {
    parent: { database_id: process.env.NOTION_PROJECTS_DB_ID },
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
  const props: Record<string, unknown> = {};
  if (data.name     !== undefined) props["名前"]     = { title: [{ text: { content: data.name } }] };
  if (data.domain   !== undefined) props["セクション"] = { select: { name: data.domain } };
  if (data.status   !== undefined) props["ステータス"] = { select: { name: data.status } };
  if (data.archived !== undefined) props["アーカイブ"] = { checkbox: data.archived };
  await notionFetch(`/pages/${id}`, "PATCH", { properties: props });
}

export async function deleteProject(id: string): Promise<void> {
  await notionFetch(`/pages/${id}`, "PATCH", { in_trash: true });
}

// ── タスク CRUD ──────────────────────────────────────────────

export async function createTask(data: Omit<Task, "id">): Promise<Task> {
  const props: Record<string, unknown> = {
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
  const page = await notionFetch("/pages", "POST", {
    parent: { database_id: process.env.NOTION_TASKS_DB_ID },
    properties: props,
  });
  return pageToTask(page);
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const props: Record<string, unknown> = {};
  if (data.title          !== undefined) props["タイトル"]     = { title: [{ text: { content: data.title } }] };
  if (data.due            !== undefined) props["期日"]         = { rich_text: [{ text: { content: data.due } }] };
  if (data.urgent         !== undefined) props["急ぎ"]         = { checkbox: data.urgent };
  if (data.done           !== undefined) props["完了"]         = { checkbox: data.done };
  if (data.memo           !== undefined) props["メモ"]         = { rich_text: [{ text: { content: data.memo } }] };
  if (data.staffRequested !== undefined) props["スタッフ依頼済"] = { checkbox: data.staffRequested };
  if (data.vendorRequested!== undefined) props["業者依頼済"]   = { checkbox: data.vendorRequested };
  if (data.projId         !== undefined) props["プロジェクト"] = { relation: [{ id: data.projId }] };
  await notionFetch(`/pages/${id}`, "PATCH", { properties: props });
}

export async function deleteTask(id: string): Promise<void> {
  await notionFetch(`/pages/${id}`, "PATCH", { in_trash: true });
}
