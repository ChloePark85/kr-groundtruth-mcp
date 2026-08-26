import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getBalance } from "@/lib/billing";
import { handle, json } from "@/lib/http";

export const GET = handle(async (req) => {
  const auth = await requireAuth(req);
  const [bal, usage, ledger] = await Promise.all([
    getBalance(auth.accountId),
    db().from("usage_events").select("id, tool_name, credits, cache_hit, status, upstream_ms, created_at").eq("account_id", auth.accountId).order("created_at", { ascending: false }).limit(20),
    db().from("credit_ledger").select("delta, reason, ref_id, balance_after, created_at").eq("account_id", auth.accountId).order("created_at", { ascending: false }).limit(20),
  ]);
  return json({ ok: true, account_id: auth.accountId, ...bal, recent_usage: usage.data ?? [], recent_ledger: ledger.data ?? [] });
});
