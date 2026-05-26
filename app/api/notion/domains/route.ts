import { NextRequest, NextResponse } from "next/server";
import { fetchAllDomains, createDomain } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const domains = await fetchAllDomains();
    return NextResponse.json(domains);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Failed to fetch domains", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const domain = await createDomain(data);
    return NextResponse.json(domain);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Failed to create domain", detail: msg }, { status: 500 });
  }
}
