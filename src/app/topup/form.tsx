"use client";

import { useState } from "react";

interface Props {
  packages: { credits: number; amount_krw: number }[];
  creditKrw: number;
  minCredits: number;
}

export function TopupForm({ packages, creditKrw, minCredits }: Props) {
  const [key, setKey] = useState("");
  const [credits, setCredits] = useState(packages[1]?.credits ?? packages[0].credits);
  const [custom, setCustom] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const headers = { Authorization: `Bearer ${key.trim()}`, "content-type": "application/json" };
  const chosen = custom ? Number(custom) : credits;

  const checkKey = async () => {
    setError(null);
    setBalance(null);
    if (!key.trim()) return;
    const res = await fetch("/v1/me", { headers });
    const d = await res.json();
    if (!d.ok) return setError(d.error?.message ?? "키를 확인할 수 없습니다");
    setBalance(d.balance);
  };

  const submit = async () => {
    setError(null);
    if (!key.trim()) return setError("API 키를 입력하세요");
    if (!Number.isInteger(chosen) || chosen < minCredits) return setError(`최소 ${minCredits} credits`);
    setBusy(true);
    try {
      const res = await fetch("/v1/topups", { method: "POST", headers, body: JSON.stringify({ credits: chosen }) });
      const d = await res.json();
      if (!d.ok) return setError(d.error?.message ?? "주문 생성 실패");
      window.location.href = d.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const box: React.CSSProperties = { width: "100%", padding: 12, fontSize: 15, borderRadius: 8, border: "1px solid #d4d4d8", boxSizing: "border-box" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <label>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>API 키</div>
        <input style={box} placeholder="kgt_live_..." value={key} onChange={(e) => setKey(e.target.value)} onBlur={checkKey} autoComplete="off" spellCheck={false} />
        {balance !== null && <div style={{ fontSize: 14, color: "#16a34a", marginTop: 4 }}>현재 잔액 {balance.toLocaleString()} credits</div>}
      </label>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>패키지</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {packages.map((p) => {
            const active = !custom && credits === p.credits;
            return (
              <button key={p.credits} type="button" onClick={() => { setCredits(p.credits); setCustom(""); }}
                style={{ ...box, textAlign: "left", cursor: "pointer", borderColor: active ? "#3182f6" : "#d4d4d8", background: active ? "#eff6ff" : "#fff" }}>
                <strong>{p.credits.toLocaleString()} credits</strong>
                <div style={{ fontSize: 13, color: "#555" }}>{p.amount_krw.toLocaleString()}원</div>
              </button>
            );
          })}
        </div>
        <input style={{ ...box, marginTop: 8 }} type="number" min={minCredits} step={100} placeholder={`직접 입력 (최소 ${minCredits})`} value={custom} onChange={(e) => setCustom(e.target.value)} />
      </div>

      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}

      <button type="button" onClick={submit} disabled={busy}
        style={{ ...box, background: busy ? "#ccc" : "#3182f6", color: "#fff", border: 0, cursor: busy ? "default" : "pointer", fontWeight: 600 }}>
        {Number.isInteger(chosen) && chosen > 0 ? `${(chosen * creditKrw).toLocaleString()}원 결제 페이지로` : "결제 페이지로"}
      </button>
      <p style={{ fontSize: 13, color: "#777", margin: 0 }}>결제 완료 후 크레딧은 즉시 반영됩니다. 영수증은 토스페이먼츠에서 발송됩니다.</p>
    </div>
  );
}
