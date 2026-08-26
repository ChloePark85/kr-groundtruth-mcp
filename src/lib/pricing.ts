import { config } from "./config";
import { db } from "./db";
import { TOOLS } from "./tools/registry";

interface Price { tool_name: string; credits: number; cache_hit_credits: number; description: string; active: boolean }

let cache: { at: number; rows: Price[] } | null = null;

export const loadPrices = async (): Promise<Price[]> => {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  const { data, error } = await db().from("tool_prices").select("*").eq("active", true);
  if (error) throw new Error(error.message);
  cache = { at: Date.now(), rows: (data ?? []) as Price[] };
  return cache.rows;
};

export const TOPUP_PACKAGES = [100, 500, 2000, 10000].map((credits) => ({
  credits,
  amount_krw: credits * config.creditKrw,
}));

export const getPricing = async () => {
  const prices = await loadPrices();
  const byName = new Map(prices.map((p) => [p.tool_name, p]));
  return {
    currency: "KRW",
    credit_price_krw: config.creditKrw,
    signup_bonus_credits: config.signupBonusCredits,
    tools: TOOLS.map((t) => {
      const p = byName.get(t.name);
      return {
        name: t.name,
        credits: p?.credits ?? t.credits,
        cache_hit_credits: p?.cache_hit_credits ?? t.cacheHitCredits,
        cache_ttl_sec: t.cacheTtlSec,
        source: t.source,
        description: t.description,
      };
    }),
    topup_packages: TOPUP_PACKAGES,
    topup: {
      how: "POST /v1/topups {credits} with your API key → returns checkout_url. A human operator pays via card (Toss Payments); credits are added on confirmation.",
      min_credits: config.minTopupCredits,
    },
    mcp_url: `${config.publicUrl()}/api/mcp`,
    openapi_url: `${config.publicUrl()}/openapi.json`,
  };
};
