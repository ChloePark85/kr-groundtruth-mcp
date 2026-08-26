import { config } from "../config";
import { asArray, upstreamFetch, UpstreamError } from "./http";

const SOURCE = "국토교통부 아파트 매매 실거래가 (data.go.kr)";

type Item = Record<string, string | number | undefined>;

const pick = (it: Item, ...keys: string[]) => {
  for (const k of keys) {
    const v = it[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
};

const toInt = (v: string | null) => (v == null ? null : Number(v.replace(/[^\d.-]/g, "")) || null);

export const aptTrades = async (lawdCode: string, dealYm: string, page = 1, rows = 100) => {
  const qs = new URLSearchParams({
    serviceKey: config.upstream.dataGoKrKey(),
    LAWD_CD: lawdCode,
    DEAL_YMD: dealYm,
    pageNo: String(page),
    numOfRows: String(rows),
  });
  const res = await upstreamFetch<{
    response?: {
      header: { resultCode: string; resultMsg: string };
      body?: { items?: { item?: Item | Item[] } | ""; totalCount?: string; numOfRows?: string; pageNo?: string };
    };
    OpenAPI_ServiceResponse?: { cmmMsgHeader: { returnAuthMsg?: string; errMsg?: string; returnReasonCode?: string } };
  }>(SOURCE, `https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?${qs}`, { as: "xml" });

  if (res.OpenAPI_ServiceResponse) {
    const h = res.OpenAPI_ServiceResponse.cmmMsgHeader;
    throw new UpstreamError(SOURCE, h.returnAuthMsg ?? h.errMsg ?? "error", { code: h.returnReasonCode });
  }
  const r = res.response;
  if (!r || (r.header.resultCode !== "00" && r.header.resultCode !== "000")) {
    throw new UpstreamError(SOURCE, r?.header.resultMsg ?? "malformed response", { code: r?.header.resultCode });
  }
  const items = typeof r.body?.items === "object" ? asArray(r.body?.items?.item) : [];
  return {
    source: SOURCE,
    lawd_code: lawdCode,
    deal_month: dealYm,
    total: toInt(r.body?.totalCount ?? null) ?? items.length,
    page,
    results: items.map((it) => {
      const y = pick(it, "dealYear", "년");
      const m = pick(it, "dealMonth", "월");
      const d = pick(it, "dealDay", "일");
      return {
        apartment_name: pick(it, "aptNm", "아파트"),
        deal_amount_krw: (toInt(pick(it, "dealAmount", "거래금액")) ?? 0) * 10_000,
        deal_amount_raw: pick(it, "dealAmount", "거래금액"),
        deal_date: y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : null,
        exclusive_area_m2: Number(pick(it, "excluUseAr", "전용면적") ?? 0) || null,
        floor: toInt(pick(it, "floor", "층")),
        build_year: toInt(pick(it, "buildYear", "건축년도")),
        dong: pick(it, "umdNm", "법정동"),
        jibun: pick(it, "jibun", "지번"),
        road_name: pick(it, "roadNm", "도로명"),
        sigungu_code: pick(it, "sggCd", "지역코드"),
        deal_type: pick(it, "dealingGbn", "거래유형"),
        canceled: pick(it, "cdealType", "해제여부") === "O",
        canceled_date: pick(it, "cdealDay", "해제사유발생일"),
        seller_type: pick(it, "slerGbn", "매도자"),
        buyer_type: pick(it, "buyerGbn", "매수자"),
      };
    }),
  };
};
