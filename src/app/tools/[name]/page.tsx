import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { config } from "@/lib/config";
import { costLine, getTool, TOOLS } from "@/lib/tools/registry";
import { TOOL_SEO } from "@/lib/tools/seo";
import { EXAMPLES } from "@/lib/tools/examples";

export const dynamicParams = false;
export const generateStaticParams = () => TOOLS.map((t) => ({ name: t.name }));

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const t = getTool(name);
  const s = TOOL_SEO[name];
  if (!t || !s) return {};
  const base = config.publicUrl();
  return {
    title: s.title,
    description: `${costLine(t)} ${t.description}`,
    keywords: s.keywords,
    alternates: { canonical: `${base}/tools/${name}` },
    openGraph: { title: s.title, description: t.description, url: `${base}/tools/${name}`, type: "website" },
  };
}

const pre: React.CSSProperties = { background: "#f4f4f5", padding: 16, borderRadius: 8, overflowX: "auto", fontSize: 13, lineHeight: 1.5 };

export default async function ToolPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const t = getTool(name);
  const s = TOOL_SEO[name];
  if (!t || !s) notFound();
  const base = config.publicUrl();
  const schema = z.toJSONSchema(t.input, { io: "input" }) as { properties?: Record<string, { type?: string; description?: string; default?: unknown }>; required?: string[] };
  const example = structuredClone(EXAMPLES[name]) as { meta?: Record<string, unknown> };
  if (example?.meta) Object.assign(example.meta, { cost: t.credits, cache_hit: false });
  const argsJson = JSON.stringify(s.exampleArgs);
  const priceKrw = t.credits * config.creditKrw;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    name: s.title,
    alternateName: s.titleEn,
    description: t.description,
    url: `${base}/tools/${name}`,
    documentation: `${base}/openapi.json`,
    provider: { "@type": "Organization", name: "Korea Ground-Truth", url: base },
    offers: { "@type": "Offer", price: priceKrw, priceCurrency: "KRW", description: `${t.credits} credits per call (1 credit = ${config.creditKrw} KRW)` },
    keywords: s.keywords.join(", "),
  };

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p style={{ fontSize: 13 }}><Link href="/">Korea Ground-Truth</Link> / <Link href="/tools">Tools</Link> / <code>{t.name}</code></p>
      <h1 style={{ fontSize: 26 }}>{s.title}</h1>
      <p style={{ color: "#555" }}>{s.titleEn}</p>
      <p><strong>{costLine(t)}</strong> ≈ {priceKrw}원/호출 · 출처: {t.source} · 캐시 {t.cacheTtlSec ? `${Math.round(t.cacheTtlSec / 3600)}시간` : "없음"}</p>

      <h2>어떤 문제를 푸나</h2>
      <p>{s.problem}</p>
      <ul>{s.useCases.map((u) => <li key={u}>{u}</li>)}</ul>

      <h2>호출 방법</h2>
      <h3>REST</h3>
      <pre style={pre}>{`curl -X POST ${base}/v1/tools/${t.name} \\
  -H "Authorization: Bearer kgt_live_..." \\
  -H "content-type: application/json" \\
  -d '${argsJson}'`}</pre>
      <h3>MCP (Claude Code / Cursor / any MCP client)</h3>
      <pre style={pre}>{`claude mcp add --transport http kgt ${base}/api/mcp --header "Authorization: Bearer kgt_live_..."
# then ask: "${t.name} 툴로 ${argsJson} 조회해줘"`}</pre>
      <h3>API 키 발급 (사람 불필요, 무료 {config.signupBonusCredits} credits)</h3>
      <pre style={pre}>{`curl -X POST ${base}/v1/accounts -H "content-type: application/json" -d '{"email":"you@example.com"}'`}</pre>

      <h2>입력</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead><tr><th align="left">field</th><th align="left">type</th><th align="left">required</th><th align="left">description</th></tr></thead>
        <tbody>
          {Object.entries(schema.properties ?? {}).map(([k, v]) => (
            <tr key={k} style={{ borderTop: "1px solid #e4e4e7" }}>
              <td><code>{k}</code></td><td>{v.type ?? "-"}</td><td>{schema.required?.includes(k) ? "yes" : `no${v.default !== undefined ? ` (default ${JSON.stringify(v.default)})` : ""}`}</td><td>{v.description ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>응답 예시 (실제 응답, 2026-08-26)</h2>
      <pre style={pre}>{JSON.stringify(example, null, 2)}</pre>
      <p style={{ fontSize: 14, color: "#555" }}>모든 응답은 <code>meta.cost</code>, <code>meta.balance_remaining</code>를 포함합니다. 업스트림 오류 시 자동 환불되며, 잔액 부족 시 <code>402 INSUFFICIENT_CREDITS</code>와 함께 충전 URL이 반환됩니다.</p>

      <h2>함께 쓰는 툴</h2>
      <ul>{s.related.map((r) => { const rt = getTool(r); return rt ? <li key={r}><Link href={`/tools/${r}`}>{TOOL_SEO[r]?.title ?? r}</Link> — {costLine(rt)}</li> : null; })}</ul>

      <p style={{ fontSize: 13, color: "#777", marginTop: 40 }}>
        <a href="/llms.txt">llms.txt</a> · <a href="/openapi.json">openapi.json</a> · <a href="/pricing.json">pricing.json</a>
      </p>
    </main>
  );
}
