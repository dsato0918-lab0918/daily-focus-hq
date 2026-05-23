import { NextRequest, NextResponse } from "next/server";
import { createTask } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const task = await createTask(data);
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
