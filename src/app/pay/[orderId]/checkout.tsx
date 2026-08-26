"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";

interface Props {
  clientKey: string;
  orderId: string;
  amount: number;
  credits: number;
  customerEmail: string;
  successUrl: string;
  failUrl: string;
}

export function TossCheckout(p: Props) {
  const widgets = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const toss = await loadTossPayments(p.clientKey);
        const w = toss.widgets({ customerKey: ANONYMOUS });
        await w.setAmount({ currency: "KRW", value: p.amount });
        await Promise.all([
          w.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          w.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
        ]);
        if (!cancelled) {
          widgets.current = w;
          setReady(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [p.clientKey, p.amount]);

  const pay = async () => {
    if (!widgets.current) return;
    try {
      await widgets.current.requestPayment({
        orderId: p.orderId,
        orderName: `Korea Ground-Truth ${p.credits} credits`,
        successUrl: p.successUrl,
        failUrl: p.failUrl,
        customerEmail: p.customerEmail || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <div id="payment-method" />
      <div id="agreement" />
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button
        onClick={pay}
        disabled={!ready}
        style={{ width: "100%", padding: 14, fontSize: 16, borderRadius: 8, border: 0, background: ready ? "#3182f6" : "#ccc", color: "#fff", cursor: ready ? "pointer" : "default" }}
      >
        {p.amount.toLocaleString()}원 결제하기
      </button>
    </div>
  );
}
