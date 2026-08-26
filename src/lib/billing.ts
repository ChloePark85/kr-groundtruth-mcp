import { config } from "./config";
import { db } from "./db";
import { ApiError } from "./errors";

export const getBalance = async (accountId: string) => {
  const { data, error } = await db().from("account_balances").select("balance").eq("account_id", accountId).maybeSingle();
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return {
    balance: data?.balance ?? 0,
    credit_price_krw: config.creditKrw,
    topup: "POST /v1/topups {credits} → checkout_url (hand it to a human operator to pay)",
  };
};

export const debit = async (accountId: string, tool: string, eventId: string, cacheHit: boolean) => {
  const { data, error } = await db().rpc("debit_credits", {
    p_account: accountId,
    p_tool: tool,
    p_event: eventId,
    p_cache_hit: cacheHit,
  });
  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDITS")) {
      const balance = Number(error.details) || 0;
      const required = Number(error.hint) || 0;
      throw new ApiError(402, "INSUFFICIENT_CREDITS", `Need ${required} credits, balance is ${balance}.`, {
        balance,
        required,
        topup_url: `${config.publicUrl()}/v1/topups`,
        topup_how: "POST /v1/topups {\"credits\": N} with this API key, then give checkout_url to a human to pay.",
      });
    }
    if (error.message.includes("UNKNOWN_TOOL")) throw new ApiError(404, "UNKNOWN_TOOL", `Unknown tool: ${tool}`);
    throw new ApiError(500, "DB_ERROR", error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { balance: row.balance as number, cost: row.cost as number };
};

export const credit = async (accountId: string, delta: number, reason: string, ref: string) => {
  const { data, error } = await db().rpc("credit_credits", {
    p_account: accountId,
    p_delta: delta,
    p_reason: reason,
    p_ref: ref,
  });
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return { balance: row.balance as number, applied: row.applied as boolean };
};
