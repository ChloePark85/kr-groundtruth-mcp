import Link from "next/link";
import { config } from "@/lib/config";
import { EXAMPLES_WORKFLOWS } from "@/lib/examples";
import { costLine, TOOLS } from "@/lib/tools/registry";
import { TOOL_SEO } from "@/lib/tools/seo";

const SOURCES = [
  ["사업자등록 상태·진위", "국세청 (National Tax Service)", "verify_business_registration"],
  ["법인 검색·기업개황", "금융감독원 DART", "lookup_corporation"],
  ["도로명주소·우편번호·법정동코드", "행정안전부 도로명주소 (MOIS)", "search_address"],
  ["아파트 매매 실거래가", "국토교통부 (MOLIT)", "apartment_trade_prices"],
  ["현행 법령", "법제처 국가법령정보센터 (MOLEG)", "search_law"],
];

const pre: React.CSSProperties = { background: "#f4f4f5", padding: 16, borderRadius: 8, overflowX: "auto", fontSize: 13, lineHeight: 1.5 };

export default function Home() {
  const base = config.publicUrl();
  return (
    <main style={{ maxWidth: 800, margin: "48px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
      <p style={{ fontSize: 13, color: "#777", margin: 0 }}>Korea Ground-Truth (KGT) · Korean Official Data MCP · Korea Verification API</p>
      <h1 style={{ fontSize: 34, lineHeight: 1.25, margin: "8px 0" }}>AI 에이전트가 한국에서 행동하기 전에 확인하는 API</h1>
      <p style={{ fontSize: 20, color: "#333", margin: "4px 0" }}>Official Korean data for AI agents. One API. One MCP.</p>
      <p style={{ fontSize: 17, color: "#555" }}>사업자 · 법인 · 주소 · 부동산 실거래 · 법령</p>
      <p style={{ fontSize: 17 }}>
        <strong>국세청·DART·행안부·국토부·법제처 API를 다섯 번 붙이지 마세요.</strong> Korea Ground-Truth 하나만 에이전트에게 주세요.
        가입에 사람이 필요 없고, 첫 키에 <strong>무료 {config.signupBonusCredits} credits</strong>가 들어 있습니다. 이후 호출당 {config.creditKrw}~{3 * config.creditKrw}원.
      </p>
      <pre style={pre}>{`curl -X POST ${base}/v1/accounts -H 'content-type: application/json' -d '{"email":"you@example.com"}'
claude mcp add --transport http kgt ${base}/api/mcp --header "Authorization: Bearer kgt_live_..."`}</pre>

      <h2>에이전트가 실제로 하는 일</h2>
      <p style={{ color: "#555", marginTop: -6 }}>프로덕션에서 캡처한 실제 호출 trace입니다.</p>
      {EXAMPLES_WORKFLOWS.map((e) => (
        <section key={e.slug} style={{ border: "1px solid #e4e4e7", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 15 }}><strong>You:</strong> {e.prompt}</div>
          <ul style={{ margin: "6px 0", paddingLeft: 18, fontSize: 15 }}>{e.answer.slice(0, 3).map((a) => <li key={a}>{a}</li>)}</ul>
          <div style={{ fontSize: 13, color: "#777" }}><code>{e.chain.join(" → ")}</code> · <Link href={`/examples/${e.slug}`}>전체 trace 보기 →</Link></div>
        </section>
      ))}

      <h2>데이터 출처 (provenance)</h2>
      <p style={{ color: "#555", marginTop: -6 }}>모든 응답의 <code>meta.source</code>에 출처 기관이 명시됩니다. 가공은 정규화(영문 snake_case + 원문 <code>_raw</code>)뿐입니다.</p>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <tbody>
          {SOURCES.map(([what, src, tool]) => (
            <tr key={tool} style={{ borderTop: "1px solid #e4e4e7" }}>
              <td style={{ padding: "6px 0" }}>{what}</td><td>{src}</td><td><Link href={`/tools/${tool}`}><code>{tool}</code></Link></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>에이전트가 고객이라서 다른 점</h2>
      <ul>
        <li><code>POST /v1/accounts</code> 한 번이면 키 발급 — 가입 폼·이메일 인증 없음</li>
        <li>툴 설명 첫 줄에 <code>Cost: N credits/call</code> — 에이전트가 가격을 읽고 계획</li>
        <li>응답마다 <code>meta.cost</code>, <code>meta.balance_remaining</code> — 잔액 부족 시 <code>402</code> + 충전 URL을 사람에게 전달</li>
        <li>업스트림 실패는 자동 환불, 장부는 append-only</li>
        <li><a href="/llms.txt">llms.txt</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing.json">pricing.json</a> · 공식 MCP Registry <code>io.github.ChloePark85/kr-groundtruth</code></li>
      </ul>

      <h2><Link href="/tools">Tools</Link></h2>
      <ul>
        {TOOLS.map((t) => (
          <li key={t.name}><Link href={`/tools/${t.name}`}>{TOOL_SEO[t.name]?.title.split(" — ")[0] ?? t.name}</Link> <span style={{ color: "#777", fontSize: 13 }}>{costLine(t)}</span></li>
        ))}
      </ul>

      <p style={{ fontSize: 13, color: "#777", marginTop: 32 }}>
        <Link href="/topup">크레딧 충전</Link> · <a href="https://github.com/ChloePark85/kr-groundtruth-mcp">GitHub</a> · MCP endpoint <code>{base}/api/mcp</code>
      </p>
    </main>
  );
}
