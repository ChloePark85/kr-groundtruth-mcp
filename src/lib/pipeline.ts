import { randomUUID } from "node:crypto";
import type { AuthContext } from "./auth";
import { cacheGet, cacheSet, requestHash } from "./cache";
import { credit, debit, getBalance } from "./billing";
import { db } from "./db";
import { ApiError, toApiError } from "./errors";
import { getTool } from "./tools/registry";

export interface Envelope {
  ok: true;
  data: unknown;
  meta: {
    tool: string;
    cost: number;
    balance_remaining: number;
    cache_hit: boolean;
    source: string;
    fetched_at: string;
    usage_event_id: string | null;
  };
}

/**
 * Shared by MCP and REST: auth → validate → (cache lookup) → debit → upstream → record.
 * Debit happens before the upstream call; upstream failure refunds.
 */
export const executeTool = async (toolName: string, rawArgs: unknown, auth: AuthContext): Promise<Envelope> => {
  const tool = getTool(toolName);
  if (!tool) throw new ApiError(404, "UNKNOWN_TOOL", `Unknown tool: ${toolName}`);

  const parsed = tool.input.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_ARGUMENTS", "Invalid arguments", { issues: parsed.error.issues });
  }
  const args = parsed.data;
  const ctx = { auth };
  const started = Date.now();

  // Free tools: no debit, no cache, no usage row.
  if (tool.credits === 0) {
    const data = await tool.run(args, ctx);
    const { balance } = await getBalance(auth.accountId);
    return envelope(tool.name, data, 0, balance, false, tool.source, null);
  }

  const hash = tool.cacheTtlSec > 0 ? requestHash(tool.name, args) : null;
  const cached = hash ? await cacheGet<unknown>(hash) : null;
  const eventId = randomUUID();
  let debited: { balance: number; cost: number };
  try {
    debited = await debit(auth.accountId, tool.name, eventId, cached !== null);
  } catch (e) {
    const err = toApiError(e);
    if (err.code === "INSUFFICIENT_CREDITS") {
      await recordUsage(eventId, auth, tool.name, 0, cached !== null, Date.now() - started, "insufficient_credits", hash, err.message);
    }
    throw err;
  }
  const { balance, cost } = debited;

  if (cached !== null) {
    await recordUsage(eventId, auth, tool.name, cost, true, Date.now() - started, "ok", hash);
    return envelope(tool.name, cached, cost, balance, true, tool.source, eventId);
  }

  try {
    const data = await tool.run(args, ctx);
    if (hash) void cacheSet(hash, tool.name, data, tool.cacheTtlSec);
    await recordUsage(eventId, auth, tool.name, cost, false, Date.now() - started, "ok", hash);
    return envelope(tool.name, data, cost, balance, false, tool.source, eventId);
  } catch (e) {
    const err = toApiError(e);
    const refunded = await credit(auth.accountId, cost, "refund", eventId).catch(() => null);
    await recordUsage(eventId, auth, tool.name, 0, false, Date.now() - started, "upstream_error", hash, err.message);
    throw new ApiError(err.status, err.code, err.message, {
      ...err.details,
      refunded: refunded?.applied ?? false,
      balance_remaining: refunded?.balance ?? balance,
    });
  }
};

const envelope = (
  tool: string,
  data: unknown,
  cost: number,
  balance: number,
  cacheHit: boolean,
  source: string,
  eventId: string | null,
): Envelope => ({
  ok: true,
  data,
  meta: {
    tool,
    cost,
    balance_remaining: balance,
    cache_hit: cacheHit,
    source,
    fetched_at: new Date().toISOString(),
    usage_event_id: eventId,
  },
});

const recordUsage = async (
  id: string,
  auth: AuthContext,
  tool: string,
  credits: number,
  cacheHit: boolean,
  ms: number,
  status: string,
  hash: string | null,
  error?: string,
) => {
  await db().from("usage_events").insert({
    id,
    account_id: auth.accountId,
    api_key_id: auth.keyId,
    tool_name: tool,
    credits,
    cache_hit: cacheHit,
    upstream_ms: ms,
    status,
    request_hash: hash,
    error: error ?? null,
  });
};
