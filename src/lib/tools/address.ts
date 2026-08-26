import { z } from "zod";
import { defineTool } from "./types";
import { jusoSearch } from "../upstream/juso";

export const searchAddress = defineTool({
  name: "search_address",
  title: "주소 검색 / 정규화",
  description:
    "도로명주소·지번주소·건물명 키워드로 공식 주소를 검색해 정규화합니다. " +
    "우편번호(postal_code), 행정구역코드(adm_code), 아파트 실거래가 조회용 법정동코드 5자리(lawd_code), 영문주소를 반환합니다. " +
    "예: '세종대로 209', '역삼동 736-1', '삼성전자 본사'.",
  input: z.object({
    keyword: z.string().min(2).max(100).describe("검색 키워드 (도로명/지번/건물명)"),
    page: z.number().int().min(1).default(1),
    per_page: z.number().int().min(1).max(50).default(10),
  }),
  credits: 1,
  cacheHitCredits: 1,
  cacheTtlSec: 60 * 60 * 24 * 30,
  source: "행정안전부 (juso.go.kr)",
  run: (a) => jusoSearch(a.keyword, a.page, a.per_page),
});
