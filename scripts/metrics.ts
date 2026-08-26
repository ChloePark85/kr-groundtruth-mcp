/**
 * Weekly metrics report. Run: npm run metrics [-- --days 7 --include-test]
 * Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (reads .env.local via dotenv-less loader below).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* rely on env */ }

const arg = (k: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const days = Number(arg("--days") ?? 7);
const includeTest = process.argv.includes("--include-test");

const fmt = (n: unknown) => (n == null ? "-" : typeof n === "number" ? n.toLocaleString() : String(n));
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-");
const dur = (s: number | null) => (s == null ? "-" : s < 120 ? `${Math.round(s)}s` : s < 7200 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`);

const main = async () => {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: r, error } = await sb.rpc("metrics_report", { p_days: days, p_exclude_test: !includeTest });
  if (error) throw new Error(error.message);

  const f = r.funnel_window, fa = r.funnel_all_time, t = r.time_to_first_call_sec, c = r.calls_window, rev = r.revenue;
  console.log(`\nKorea Ground-Truth — metrics (last ${days} days${includeTest ? ", incl. test accounts" : ""})  ${new Date(r.generated_at).toLocaleString("ko-KR")}\n`);
  console.log(`★ Weekly Active API Keys: ${fmt(r.north_star.weekly_active_api_keys)}   (window: ${fmt(r.north_star.active_keys_in_window)})`);
  console.log(`  by week: ${(r.north_star.wak_by_week as { week: string; active_keys: number }[]).map((w) => `${w.week.slice(5)}=${w.active_keys}`).join("  ") || "-"}\n`);

  console.log(`Funnel (window)                 all-time`);
  console.log(`  accounts created   ${fmt(f.accounts_created).padStart(5)}           ${fmt(fa.accounts_created)}`);
  console.log(`  → first tool call  ${fmt(f.first_tool_call).padStart(5)}  ${pct(f.first_tool_call, f.accounts_created).padStart(5)}   ${fmt(fa.first_tool_call)}  ${pct(fa.first_tool_call, fa.accounts_created)}`);
  console.log(`  → 2nd-day call     ${fmt(f.second_day_call).padStart(5)}  ${pct(f.second_day_call, f.first_tool_call).padStart(5)}   ${fmt(fa.second_day_call)}  ${pct(fa.second_day_call, fa.first_tool_call)}`);
  console.log(`  → hit 402          ${fmt(f.hit_402).padStart(5)}           ${fmt(fa.hit_402)}`);
  console.log(`  → first top-up     ${fmt(f.first_topup).padStart(5)}  ${pct(f.first_topup, f.hit_402).padStart(5)}   ${fmt(fa.first_topup)}  ${pct(fa.first_topup, fa.hit_402)}  (of those who hit 402)\n`);

  console.log(`Time to first tool call (signups in window, n=${fmt(t.n)}): median ${dur(t.median)}, p90 ${dur(t.p90)}, ≤2min ${fmt(t.under_2min)}/${fmt(t.n)}\n`);

  console.log(`Calls (window): ${fmt(c.total)} total · ${fmt(c.ok)} ok · ${fmt(c.upstream_error)} upstream err · ${fmt(c.insufficient_credits)} × 402 · cache hit ${c.cache_hit_rate == null ? "-" : Math.round(c.cache_hit_rate * 100) + "%"} · ${fmt(c.credits_consumed)} credits`);
  const byTool = Object.entries(c.by_tool as Record<string, { calls: number; accounts: number; errors: number }>).sort((a, b) => b[1].calls - a[1].calls);
  for (const [name, v] of byTool) console.log(`  ${name.padEnd(30)} ${fmt(v.calls).padStart(6)} calls  ${fmt(v.accounts).padStart(4)} accts  ${fmt(v.errors).padStart(3)} err`);

  console.log(`\nRevenue: ${fmt(rev.window_krw)} KRW (window) · ${fmt(rev.all_time_krw)} KRW all-time · ${fmt(rev.paying_accounts)} paying · ${fmt(rev.pending_orders_window)} pending orders\n`);

  console.log(`Recent signups:`);
  for (const s of r.recent_signups as { email: string; created_at: string; first_call_at: string | null; calls: number; balance: number | null }[]) {
    const ttfc = s.first_call_at ? dur((new Date(s.first_call_at).getTime() - new Date(s.created_at).getTime()) / 1000) : "never";
    console.log(`  ${s.created_at.slice(0, 16).replace("T", " ")}  ${s.email.padEnd(32)} first call: ${ttfc.padEnd(6)} calls: ${fmt(s.calls).padStart(4)}  balance: ${fmt(s.balance)}`);
  }
  console.log();
};

main().catch((e) => { console.error(e); process.exit(1); });
