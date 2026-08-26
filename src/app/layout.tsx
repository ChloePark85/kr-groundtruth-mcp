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
  title: { default: "Korea Ground-Truth — Korean Business, Legal & Real Estate MCP API", template: "%s | Korea Ground-Truth (KGT)" },
  description: "Official Korean data for AI agents. One API, one MCP: 국세청 사업자등록, DART 법인, 도로명주소, 국토부 실거래가, 법제처 법령. Korea Verification API / Korean Official Data MCP (KGT).",
  keywords: ["Korea Ground-Truth", "KGT", "Korean Official Data MCP", "Korea Verification API", "Korea MCP", "DART MCP", "사업자등록 조회 API", "한국 공공데이터 MCP"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
