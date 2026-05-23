import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const project = await createProject(data);
    return NextResponse.json(project);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
