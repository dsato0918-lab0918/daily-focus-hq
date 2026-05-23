import { NextResponse } from "next/server";
import { fetchAllProjects, fetchAllTasks } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [projects, tasks] = await Promise.all([
      fetchAllProjects(),
      fetchAllTasks(),
    ]);
    return NextResponse.json({ projects, tasks });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Notion fetch failed" }, { status: 500 });
  }
}
