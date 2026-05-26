import { NextResponse } from "next/server";
import { fetchAllProjects, fetchAllTasks, fetchAllDomains } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  const projDb = process.env.NOTION_PROJECTS_DB_ID;
  const taskDb = process.env.NOTION_TASKS_DB_ID;
  const token  = process.env.NOTION_TOKEN;

  if (!projDb || !taskDb || !token) {
    return NextResponse.json({ error: "Env vars missing" }, { status: 500 });
  }

  try {
    const [projects, tasks, domains] = await Promise.all([
      fetchAllProjects(),
      fetchAllTasks(),
      fetchAllDomains().catch((e) => {
        console.warn("fetchAllDomains failed (integration may not have access):", e);
        return [];
      }),
    ]);
    return NextResponse.json({ projects, tasks, domains });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Notion fetch failed", detail: msg }, { status: 500 });
  }
}
