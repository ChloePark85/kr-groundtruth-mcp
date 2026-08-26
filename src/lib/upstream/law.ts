import { config } from "../config";
import { asArray, upstreamFetch, UpstreamError } from "./http";

const SOURCE = "법제처 국가법령정보 (law.go.kr)";

interface LawRow {
  법령ID: string;
  법령일련번호: string;
  법령명한글: string;
  법령약칭명?: string;
  공포일자: string;
  공포번호: string;
  시행일자: string;
  소관부처명: string;
  법령구분명: string;
  제개정구분명?: string;
  법령상세링크: string;
  현행연혁코드?: string;
}

export const lawSearch = async (query: string, page = 1, display = 20) => {
  const qs = new URLSearchParams({
    OC: config.upstream.lawOc(),
    target: "law",
    type: "JSON",
    query,
    display: String(display),
    page: String(page),
  });
  const res = await upstreamFetch<{ LawSearch?: { totalCnt: string; law?: LawRow | LawRow[] } } | string>(
    SOURCE,
    `https://www.law.go.kr/DRF/lawSearch.do?${qs}`,
  );
  if (typeof res === "string" || !res.LawSearch) {
    throw new UpstreamError(SOURCE, "unexpected response (OC not approved or bad query?)");
  }
  return {
    source: SOURCE,
    total: Number(res.LawSearch.totalCnt),
    page,
    results: asArray(res.LawSearch.law).map((l) => ({
      law_id: l.법령ID,
      law_serial_no: l.법령일련번호,
      name: l.법령명한글,
      short_name: l.법령약칭명 || null,
      law_type: l.법령구분명,
      ministry: l.소관부처명,
      promulgation_date: l.공포일자,
      promulgation_no: l.공포번호,
      enforcement_date: l.시행일자,
      revision_type: l.제개정구분명 || null,
      is_current: l.현행연혁코드 ? l.현행연혁코드 === "현행" : true,
      detail_url: l.법령상세링크 ? `https://www.law.go.kr${l.법령상세링크}` : null,
    })),
  };
};
