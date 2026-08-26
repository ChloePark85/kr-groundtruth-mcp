import { config } from "./config";
import { db } from "./db";
import { ApiError } from "./errors";
import { credit } from "./billing";

const auth = () => `Basic ${Buffer.from(`${config.toss.secretKey()}:`).toString("base64")}`;

interface TossPayment {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  method?: string;
  [k: string]: unknown;
}

/** Confirms a Toss payment for an order and credits the account. Idempotent. */
export const confirmTopup = async (orderId: string, paymentKey: string, amount: number) => {
  const { data: order, error } = await db().from("topup_orders").select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Unknown order");
  if (order.status === "confirmed") return { alreadyConfirmed: true, credits: order.credits as number, balance: null as number | null, accountId: order.account_id as string };
  if (order.amount_krw !== amount) throw new ApiError(400, "AMOUNT_MISMATCH", "Amount does not match order");

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, paymentKey, amount }),
  });
  const payment = (await res.json()) as TossPayment & { code?: string; message?: string };
  if (!res.ok || payment.status !== "DONE") {
    // ALREADY_PROCESSED_PAYMENT: a previous confirm succeeded but our DB write didn't; treat as confirmed.
    if (payment.code !== "ALREADY_PROCESSED_PAYMENT") {
      await db().from("topup_orders").update({ status: "failed", raw: payment }).eq("order_id", orderId);
      throw new ApiError(402, "PAYMENT_FAILED", payment.message ?? "confirm failed", { toss_code: payment.code });
    }
  }
  return applyTopup(order.account_id, orderId, order.credits, paymentKey, payment);
};

export const applyTopup = async (accountId: string, orderId: string, credits: number, paymentKey: string, raw: unknown) => {
  const { balance, applied } = await credit(accountId, credits, "topup", orderId);
  await db()
    .from("topup_orders")
    .update({ status: "confirmed", payment_key: paymentKey, raw, confirmed_at: new Date().toISOString() })
    .eq("order_id", orderId);
  return { alreadyConfirmed: !applied, credits, balance: balance as number | null, accountId };
};

export const fetchPayment = async (paymentKey: string): Promise<TossPayment> => {
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
    headers: { Authorization: auth() },
  });
  if (!res.ok) throw new ApiError(502, "TOSS_ERROR", `payment lookup failed: ${res.status}`);
  return (await res.json()) as TossPayment;
};
