import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ログインページとAPIルートは認証不要
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;
  const correctPassword = process.env.APP_PASSWORD;

  // 環境変数が未設定の場合は通す（ローカル開発用）
  if (!correctPassword) {
    return NextResponse.next();
  }

  if (token !== correctPassword) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
