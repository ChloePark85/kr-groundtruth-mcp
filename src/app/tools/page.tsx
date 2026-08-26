import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { costLine, TOOLS } from "@/lib/tools/registry";
import { TOOL_SEO } from "@/lib/tools/seo";

export const metadata: Metadata = {
  title: "한국 사실 검증 API 목록 — 사업자등록·주소·법인·실거래가·법령",
  description: "AI 에이전트용 한국 데이터 검증 툴. 호출당 과금, 무료 크레딧으로 시작.",
  alternates: { canonical: `${config.publicUrl()}/tools` },
};

export default function ToolsIndex() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
      <p style={{ fontSize: 13 }}><Link href="/">Korea Ground-Truth</Link> / Tools</p>
      <h1>한국 사실 검증 API 목록</h1>
      <p>1 credit = {config.creditKrw}원. 가입 시 {config.signupBonusCredits} credits 무료. 각 페이지에 curl·MCP 예시와 실제 응답이 있습니다.</p>
      <ul style={{ paddingLeft: 18 }}>
        {TOOLS.map((t) => (
          <li key={t.name} style={{ marginBottom: 12 }}>
            <Link href={`/tools/${t.name}`}><strong>{TOOL_SEO[t.name]?.title ?? t.name}</strong></Link>
            <br /><span style={{ fontSize: 14, color: "#555" }}>{costLine(t)} {t.description}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
