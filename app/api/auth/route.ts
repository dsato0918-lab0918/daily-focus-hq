import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correctPassword = process.env.APP_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", correctPassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30日間
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("auth_token");
  return res;
}
