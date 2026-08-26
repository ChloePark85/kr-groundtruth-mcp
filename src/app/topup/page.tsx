import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { TOPUP_PACKAGES } from "@/lib/pricing";
import { TopupForm } from "./form";

export const metadata: Metadata = {
  title: "크레딧 충전",
  description: "API 키로 크레딧을 충전합니다. 카드·간편결제(토스페이먼츠).",
  robots: { index: false },
};

export default function TopupPage() {
  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <p style={{ fontSize: 13 }}><Link href="/">Korea Ground-Truth</Link> / 충전</p>
      <h1>크레딧 충전</h1>
      <p style={{ color: "#555" }}>
        1 credit = {config.creditKrw}원 · 최소 {config.minTopupCredits} credits. 에이전트가 사용하는 API 키(<code>kgt_live_…</code>)를 넣고 패키지를 고르면 결제 페이지로 이동합니다.
        키가 없다면 <code>POST /v1/accounts</code>로 발급하세요 (<a href="/llms.txt">llms.txt</a> 참고).
      </p>
      <TopupForm packages={TOPUP_PACKAGES} creditKrw={config.creditKrw} minCredits={config.minTopupCredits} />
    </main>
  );
}
