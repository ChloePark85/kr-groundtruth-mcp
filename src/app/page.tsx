import { config } from "@/lib/config";
import { costLine, TOOLS } from "@/lib/tools/registry";

export default function Home() {
  const base = config.publicUrl();
  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1>Korea Ground-Truth</h1>
      <p>AI 에이전트를 위한 한국 사실 검증 API. 사업자등록 · 주소 · 법인 · 아파트 실거래가 · 법령. 선불 크레딧, 호출당 과금, 사람 없이 시작.</p>
      <pre style={{ background: "#f4f4f5", padding: 16, borderRadius: 8, overflowX: "auto" }}>
{`curl -X POST ${base}/v1/accounts -H 'content-type: application/json' -d '{"email":"you@example.com"}'
claude mcp add --transport http kgt ${base}/api/mcp --header "Authorization: Bearer kgt_live_..."`}
      </pre>
      <h2>Tools</h2>
      <ul>
        {TOOLS.map((t) => (
          <li key={t.name}>
            <code>{t.name}</code> — {costLine(t)} {t.description}
          </li>
        ))}
      </ul>
      <p>
        <a href="/llms.txt">llms.txt</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing.json">pricing.json</a> · MCP: <code>{base}/api/mcp</code>
      </p>
    </main>
  );
}
