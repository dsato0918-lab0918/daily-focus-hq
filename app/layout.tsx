import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Focus HQ",
  description: "設計・施工・経営のタスク管理ワークスペース",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
