import { z } from "zod";
import { defineTool } from "./types";
import { lawSearch } from "../upstream/law";

export const searchLaw = defineTool({
  name: "search_law",
  title: "현행법령 검색",
  description:
    "법제처 국가법령정보센터에서 현행 법령(법률·시행령·시행규칙)을 검색합니다. " +
    "법령ID, 소관부처, 공포/시행일, 상세 링크를 반환합니다. 예: '개인정보 보호법', '주택임대차보호법'.",
  input: z.object({
    query: z.string().min(1).max(100).describe("법령명 검색어"),
    page: z.number().int().min(1).default(1),
    per_page: z.number().int().min(1).max(100).default(20),
  }),
  credits: 2,
  cacheHitCredits: 1,
  cacheTtlSec: 60 * 60 * 24,
  source: "법제처 (law.go.kr)",
  run: (a) => lawSearch(a.query, a.page, a.per_page),
});
