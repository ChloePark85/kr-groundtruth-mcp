import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_URL ?? "http://localhost:3000"),
  title: { default: "Korea Ground-Truth — AI 에이전트용 한국 사실 검증 API", template: "%s | Korea Ground-Truth" },
  description: "사업자등록 상태·주소 정규화·법인정보·아파트 실거래가·법령을 MCP/REST로 검증. 선불 크레딧, 호출당 과금, 사람 없이 시작.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
