import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { TossCheckout } from "./checkout";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { data: order } = await db()
    .from("topup_orders")
    .select("order_id, amount_krw, credits, status, accounts(email)")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order) return <Shell><h1>주문을 찾을 수 없습니다</h1></Shell>;
  if (order.status === "confirmed") return <Shell><h1>이미 결제 완료된 주문입니다</h1><p>{order.credits} credits 가 충전되었습니다. <a href="/topup">추가 충전</a></p></Shell>;

  const email = (order.accounts as unknown as { email: string } | null)?.email ?? "";
  return (
    <Shell>
      <h1>Korea Ground-Truth 크레딧 충전</h1>
      <p style={{ color: "#666" }}>주문번호 {order.order_id}</p>
      <p>
        <strong>{order.credits.toLocaleString()} credits</strong> · {order.amount_krw.toLocaleString()}원 (1 credit = {config.creditKrw}원)
      </p>
      <TossCheckout
        clientKey={config.toss.clientKey()}
        orderId={order.order_id}
        amount={order.amount_krw}
        credits={order.credits}
        customerEmail={email}
        successUrl={`${config.publicUrl()}/pay/success`}
        failUrl={`${config.publicUrl()}/pay/${order.order_id}?fail=1`}
      />
    </Shell>
  );
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main style={{ maxWidth: 560, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>{children}</main>
);
