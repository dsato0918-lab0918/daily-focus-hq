import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 認証不要のルート
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks/")   // LINE 等の外部 Webhook
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;
  const correctPassword = process.env.APP_PASSWORD;

  // 環境変数が未設定の場合は通す（ローカル開発用）
  if (!correctPassword) {
    return NextResponse.next();
  }

  if (token !== correctPassword) {
    // API ルートには JSON 401 を返す（リダイレクトすると fetch が HTML を受け取りパースエラーになる）
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ページルートはログインへリダイレクト
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
