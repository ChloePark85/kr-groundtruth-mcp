import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { EXAMPLES_WORKFLOWS } from "@/lib/examples";

export const metadata: Metadata = {
  title: "에이전트 워크플로 예시 — 거래처 검증 · 실거래가 · 법령",
  description: "Claude/Codex가 Korea Ground-Truth MCP를 호출한 실제 trace.",
  alternates: { canonical: `${config.publicUrl()}/examples` },
};

export default function ExamplesIndex() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
      <p style={{ fontSize: 13 }}><Link href="/">Korea Ground-Truth</Link> / Examples</p>
      <h1>에이전트 워크플로 예시</h1>
      <p>각 페이지는 사용자 프롬프트 → 툴 호출 체인 → 실제 응답 → 에이전트 답변 순서로, 프로덕션에서 캡처한 trace를 그대로 보여줍니다.</p>
      <ul style={{ paddingLeft: 18 }}>
        {EXAMPLES_WORKFLOWS.map((e) => (
          <li key={e.slug} style={{ marginBottom: 14 }}>
            <Link href={`/examples/${e.slug}`}><strong>{e.title}</strong></Link>
            <br /><span style={{ fontSize: 14, color: "#555" }}>"{e.prompt}" → <code>{e.chain.join(" → ")}</code></span>
          </li>
        ))}
      </ul>
    </main>
  );
}
