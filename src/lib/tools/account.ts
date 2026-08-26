import { z } from "zod";
import { defineTool } from "./types";
import { getBalance } from "../billing";
import { getPricing } from "../pricing";

export const getBalanceTool = defineTool({
  name: "get_balance",
  title: "잔액 조회",
  description: "현재 API 키 계정의 크레딧 잔액과 충전 URL 안내를 반환합니다.",
  input: z.object({}),
  credits: 0,
  cacheHitCredits: 0,
  cacheTtlSec: 0,
  source: "internal",
  run: (_a, ctx) => getBalance(ctx.auth.accountId),
});

export const getPricingTool = defineTool({
  name: "get_pricing",
  title: "가격표 조회",
  description: "툴별 크레딧 비용, 크레딧 단가(KRW), 충전 방법을 반환합니다.",
  input: z.object({}),
  credits: 0,
  cacheHitCredits: 0,
  cacheTtlSec: 0,
  source: "internal",
  run: () => getPricing(),
});
