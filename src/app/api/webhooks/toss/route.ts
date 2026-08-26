import { db } from "@/lib/db";
import { applyTopup, fetchPayment } from "@/lib/toss";
import { handle, json, readJson } from "@/lib/http";

/**
 * Toss "PAYMENT_STATUS_CHANGED" webhook. Backup for the success redirect;
 * idempotent via credit_ledger unique(reason, ref_id). We never trust the
 * webhook body — we re-fetch the payment from Toss with our secret key.
 */
export const POST = handle(async (req) => {
  const body = await readJson<{ eventType?: string; data?: { paymentKey?: string; orderId?: string; status?: string } }>(req);
  const paymentKey = body.data?.paymentKey;
  const orderId = body.data?.orderId;
  if (body.eventType !== "PAYMENT_STATUS_CHANGED" || !paymentKey || !orderId) return json({ ok: true, ignored: true });

  const payment = await fetchPayment(paymentKey);
  if (payment.status !== "DONE" || payment.orderId !== orderId) return json({ ok: true, ignored: true, status: payment.status });

  const { data: order } = await db().from("topup_orders").select("account_id, credits, amount_krw, status").eq("order_id", orderId).maybeSingle();
  if (!order || order.amount_krw !== payment.totalAmount) return json({ ok: false, error: "order mismatch" }, 400);
  if (order.status === "confirmed") return json({ ok: true, already: true });

  const r = await applyTopup(order.account_id, orderId, order.credits, paymentKey, payment);
  return json({ ok: true, applied: !r.alreadyConfirmed });
});
