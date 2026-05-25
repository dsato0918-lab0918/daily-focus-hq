import { NextResponse } from "next/server";
import { fetchAllProjects, fetchAllTasks } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  // 環境変数デバッグ
  const projDb = process.env.NOTION_PROJECTS_DB_ID;
  const taskDb = process.env.NOTION_TASKS_DB_ID;
  const token  = process.env.NOTION_TOKEN;
  console.log("PROJECTS_DB:", projDb);
  console.log("TASKS_DB:", taskDb);
  console.log("TOKEN set:", !!token);

  if (!projDb || !taskDb || !token) {
    return NextResponse.json({
      error: "Env vars missing",
      NOTION_PROJECTS_DB_ID: projDb ?? "MISSING",
      NOTION_TASKS_DB_ID: taskDb ?? "MISSING",
      NOTION_TOKEN: token ? "set" : "MISSING",
    }, { status: 500 });
  }

  try {
    const [projects, tasks] = await Promise.all([
      fetchAllProjects(),
      fetchAllTasks(),
    ]);
    return NextResponse.json({ projects, tasks });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    return NextResponse.json({ error: "Notion fetch failed", detail: msg }, { status: 500 });
  }
}
