import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "荷序健康数字化平台",
  description: "让每一次服务更清楚、安心、有回应。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
