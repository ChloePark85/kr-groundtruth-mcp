import { z } from "zod";
import { defineTool } from "./types";
import { aptTrades } from "../upstream/apt";

export const apartmentTradePrices = defineTool({
  name: "apartment_trade_prices",
  title: "아파트 매매 실거래가",
  description:
    "국토교통부 아파트 매매 실거래가를 시군구(법정동코드 5자리) + 계약월(YYYYMM) 단위로 조회합니다. " +
    "lawd_code는 search_address 결과의 lawd_code를 사용하세요 (예: 강남구 11680). " +
    "deal_amount_krw는 원 단위 정수입니다.",
  input: z.object({
    lawd_code: z.string().regex(/^\d{5}$/).describe("법정동코드 앞 5자리 (시군구)"),
    deal_month: z.string().regex(/^\d{6}$/).describe("계약년월 YYYYMM"),
    page: z.number().int().min(1).default(1),
    per_page: z.number().int().min(1).max(1000).default(100),
  }),
  credits: 3,
  cacheHitCredits: 1,
  cacheTtlSec: 60 * 60 * 24,
  source: "국토교통부 (data.go.kr)",
  run: (a) => aptTrades(a.lawd_code, a.deal_month, a.page, a.per_page),
});
