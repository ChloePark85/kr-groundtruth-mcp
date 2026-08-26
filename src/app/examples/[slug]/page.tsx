import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { config } from "@/lib/config";
import { EXAMPLES_WORKFLOWS, getExample } from "@/lib/examples";
import { costLine, getTool } from "@/lib/tools/registry";

export const dynamicParams = false;
export const generateStaticParams = () => EXAMPLES_WORKFLOWS.map((e) => ({ slug: e.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getExample(slug);
  if (!e) return {};
  return { title: e.title, description: `${e.titleEn}. Real tool-call trace from Korea Ground-Truth MCP.`, alternates: { canonical: `${config.publicUrl()}/examples/${slug}` } };
}

const pre: React.CSSProperties = { background: "#f4f4f5", padding: 14, borderRadius: 8, overflowX: "auto", fontSize: 13, lineHeight: 1.5 };
const chat: React.CSSProperties = { borderLeft: "4px solid #3182f6", padding: "8px 14px", background: "#f8fafc", borderRadius: 6, margin: "8px 0" };

export default async function ExamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = getExample(slug);
  if (!e) notFound();
  const base = config.publicUrl();
  const total = e.steps.reduce((s, x) => s + (getTool(x.tool)?.credits ?? 0), 0);

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
      <p style={{ fontSize: 13 }}><Link href="/">Korea Ground-Truth</Link> / <Link href="/examples">Examples</Link> / {e.slug}</p>
      <h1 style={{ fontSize: 26 }}>{e.title}</h1>
      <p style={{ color: "#555" }}>{e.titleEn}</p>

      <h2>사용자 → 에이전트</h2>
      <div style={chat}><strong>You:</strong> {e.prompt}</div>
      <div style={{ ...chat, borderColor: "#16a34a" }}>
        <strong>Agent</strong> <span style={{ fontSize: 12, color: "#777" }}>(툴 {e.chain.length}회 호출, {total} credits)</span>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{e.answer.map((a) => <li key={a}>{a}</li>)}</ul>
      </div>
      <p>{e.why}</p>

      <h2>호출 체인</h2>
      <p><code>{e.chain.join(" → ")}</code></p>

      <h2>실제 호출 trace (2026-08-27, 프로덕션)</h2>
      {e.steps.map((s, i) => {
        const t = getTool(s.tool);
        return (
          <section key={i} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16 }}>{i + 1}. <Link href={`/tools/${s.tool}`}>{s.tool}</Link> <span style={{ fontWeight: 400, color: "#777", fontSize: 13 }}>{t ? costLine(t) : ""}</span></h3>
            <pre style={pre}>{`→ tools/call ${s.tool} ${JSON.stringify(s.args)}`}</pre>
            <pre style={pre}>{JSON.stringify(s.response, null, 2)}</pre>
          </section>
        );
      })}

      <h2>직접 실행하기</h2>
      <pre style={pre}>{`# 1) 키 발급 (무료 ${config.signupBonusCredits} credits)
curl -X POST ${base}/v1/accounts -H "content-type: application/json" -d '{"email":"you@example.com"}'
# 2) MCP 연결
claude mcp add --transport http kgt ${base}/api/mcp --header "Authorization: Bearer kgt_live_..."
# 3) Claude에게 그대로 말하기
"${e.prompt}"`}</pre>

      <h2>다른 예시</h2>
      <ul>{EXAMPLES_WORKFLOWS.filter((x) => x.slug !== e.slug).map((x) => <li key={x.slug}><Link href={`/examples/${x.slug}`}>{x.title}</Link></li>)}</ul>
    </main>
  );
}
