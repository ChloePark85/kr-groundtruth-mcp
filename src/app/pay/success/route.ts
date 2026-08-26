import { confirmTopup } from "@/lib/toss";
import { toApiError } from "@/lib/errors";

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><main style="max-width:560px;margin:40px auto;padding:24px;font-family:system-ui,sans-serif"><h1>${title}</h1><p>${body}</p></main>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentKey = url.searchParams.get("paymentKey");
  const orderId = url.searchParams.get("orderId");
  const amount = Number(url.searchParams.get("amount"));
  if (!paymentKey || !orderId || !amount) return page("잘못된 요청", "결제 정보가 없습니다.", 400);
  try {
    const r = await confirmTopup(orderId, paymentKey, amount);
    return page(
      r.alreadyConfirmed ? "이미 처리된 결제" : "충전 완료",
      `${r.credits.toLocaleString()} credits 가 충전되었습니다. 현재 잔액: ${r.balance ?? "-"} credits. 이 창을 닫고 에이전트에게 알려주세요. <a href="/topup">추가 충전</a>`,
    );
  } catch (e) {
    const err = toApiError(e);
    return page("결제 확인 실패", `${err.code}: ${err.message}`, err.status);
  }
}
