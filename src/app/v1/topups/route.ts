import { randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth";
import { handle, json, readJson } from "@/lib/http";

export const POST = handle(async (req) => {
  const auth = await requireAuth(req);
  const body = z.object({ credits: z.number().int().min(config.minTopupCredits).max(1_000_000) }).safeParse(await readJson(req));
  if (!body.success) throw new ApiError(400, "INVALID_ARGUMENTS", `credits (integer >= ${config.minTopupCredits}) required`, { issues: body.error.issues });
  const orderId = `kgt_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const amount = body.data.credits * config.creditKrw;
  const { error } = await db().from("topup_orders").insert({ order_id: orderId, account_id: auth.accountId, amount_krw: amount, credits: body.data.credits });
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return json(
    {
      ok: true,
      order_id: orderId,
      credits: body.data.credits,
      amount_krw: amount,
      checkout_url: `${config.publicUrl()}/pay/${orderId}`,
      instructions: "Give checkout_url to a human operator. Credits are added automatically after card payment. Poll GET /v1/me to see the new balance.",
    },
    201,
  );
});

export const GET = handle(async (req) => {
  const auth = await requireAuth(req);
  const { data } = await db().from("topup_orders").select("order_id, credits, amount_krw, status, created_at, confirmed_at").eq("account_id", auth.accountId).order("created_at", { ascending: false }).limit(20);
  return json({ ok: true, orders: data ?? [] });
});
