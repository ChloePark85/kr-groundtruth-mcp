import { z } from "zod";
import { defineTool } from "./types";
import { dartCompany, dartSearchCorp } from "../upstream/dart";

export const searchCorporation = defineTool({
  name: "search_corporation",
  title: "법인 검색 (DART 고유번호)",
  description:
    "법인명으로 금융감독원 DART 등록 법인을 검색해 corp_code(8자리 고유번호)를 찾습니다. " +
    "상장사는 stock_code가 함께 반환됩니다. lookup_corporation의 corp_code 입력으로 사용하세요.",
  input: z.object({
    name: z.string().min(1).max(50).describe("법인명 일부 또는 전체"),
    limit: z.number().int().min(1).max(30).default(10),
  }),
  credits: 1,
  cacheHitCredits: 1,
  cacheTtlSec: 60 * 60 * 24 * 7,
  source: "DART corpCode",
  run: (a) => dartSearchCorp(a.name, a.limit),
});

export const lookupCorporation = defineTool({
  name: "lookup_corporation",
  title: "기업개황 조회 (DART)",
  description:
    "DART corp_code로 기업개황을 조회합니다: 정식 법인명, 대표자, 법인등록번호, 사업자등록번호, 주소, 업종코드, 설립일, 상장시장. " +
    "corp_code를 모르면 먼저 search_corporation을 호출하세요.",
  input: z.object({
    corp_code: z.string().regex(/^\d{8}$/).describe("DART 고유번호 8자리"),
  }),
  credits: 2,
  cacheHitCredits: 1,
  cacheTtlSec: 60 * 60 * 24 * 7,
  source: "DART (opendart.fss.or.kr)",
  run: (a) => dartCompany(a.corp_code),
});
