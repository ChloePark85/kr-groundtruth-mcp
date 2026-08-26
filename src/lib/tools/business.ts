import { z } from "zod";
import { defineTool } from "./types";
import { ntsStatus, ntsValidate } from "../upstream/nts";

const bno = z
  .string()
  .transform((s) => s.replace(/\D/g, ""))
  .pipe(z.string().length(10, "사업자등록번호는 숫자 10자리"));

export const verifyBusinessRegistration = defineTool({
  name: "verify_business_registration",
  title: "사업자등록 상태조회 / 진위확인",
  description:
    "국세청 사업자등록번호 상태(계속사업자/휴업/폐업/미등록)와 과세유형을 조회합니다. " +
    "대표자명(representative_name)과 개업일(opened_date, YYYYMMDD)을 함께 주면 등록정보 진위확인까지 수행합니다. " +
    "한 번에 최대 100건. 결과 status: active | suspended | closed | not_registered.",
  input: z.object({
    business_numbers: z.array(bno).min(1).max(100).describe("사업자등록번호 목록 (하이픈 유무 무관)"),
    representative_name: z.string().optional().describe("진위확인용 대표자명 (단건 조회 시)"),
    opened_date: z
      .string()
      .regex(/^\d{8}$/)
      .optional()
      .describe("진위확인용 개업일자 YYYYMMDD (단건 조회 시)"),
    business_name: z.string().optional().describe("진위확인용 상호 (선택)"),
  }),
  credits: 2,
  cacheHitCredits: 1,
  cacheTtlSec: 60 * 60,
  source: "국세청 (data.go.kr)",
  run: async (a) => {
    if (a.representative_name && a.opened_date) {
      if (a.business_numbers.length !== 1) {
        throw new Error("진위확인은 사업자등록번호 1건과 함께 요청하세요.");
      }
      return ntsValidate([
        { b_no: a.business_numbers[0], start_dt: a.opened_date, p_nm: a.representative_name, b_nm: a.business_name },
      ]);
    }
    return ntsStatus(a.business_numbers);
  },
});
