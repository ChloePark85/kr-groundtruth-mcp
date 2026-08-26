import { config } from "../config";
import { db } from "../db";
import { upstreamFetch, UpstreamError } from "./http";

const SOURCE = "금융감독원 DART (opendart.fss.or.kr)";

export const dartSearchCorp = async (name: string, limit = 10) => {
  const q = name.trim();
  const { data, error } = await db()
    .from("dart_corp_codes")
    .select("corp_code, corp_name, stock_code, modify_date")
    .ilike("corp_name", `%${q.replace(/[%_]/g, "")}%`)
    .limit(Math.max(limit * 5, 50));
  if (error) throw new UpstreamError(SOURCE, error.message);
  const norm = (s: string) => s.replace(/\(주\)|주식회사|\s/g, "");
  const rank = (r: { corp_name: string; stock_code: string | null }) =>
    (norm(r.corp_name) === norm(q) ? 0 : 10) + (r.stock_code ? 0 : 5) + Math.min(r.corp_name.length, 4) / 10;
  const rows = (data ?? []).sort((a, b) => rank(a) - rank(b)).slice(0, limit);
  return {
    source: `${SOURCE} corpCode 목록 (로컬 캐시)`,
    results: rows.map((r) => ({
      corp_code: r.corp_code,
      corp_name: r.corp_name,
      stock_code: r.stock_code || null,
      listed: !!r.stock_code,
      modified_date: r.modify_date,
    })),
  };
};

interface DartCompany {
  status: string;
  message: string;
  corp_code: string;
  corp_name: string;
  corp_name_eng: string;
  stock_name: string;
  stock_code: string;
  ceo_nm: string;
  corp_cls: string;
  jurir_no: string;
  bizr_no: string;
  adres: string;
  hm_url: string;
  ir_url: string;
  phn_no: string;
  fax_no: string;
  induty_code: string;
  est_dt: string;
  acc_mt: string;
}

const MARKET: Record<string, string> = { Y: "KOSPI", K: "KOSDAQ", N: "KONEX", E: "unlisted" };

export const dartCompany = async (corpCode: string) => {
  const qs = new URLSearchParams({ crtfc_key: config.upstream.dartKey(), corp_code: corpCode });
  const c = await upstreamFetch<DartCompany>(SOURCE, `https://opendart.fss.or.kr/api/company.json?${qs}`);
  if (c.status !== "000") throw new UpstreamError(SOURCE, c.message, { code: c.status });
  return {
    source: SOURCE,
    corp_code: c.corp_code,
    corp_name: c.corp_name,
    corp_name_en: c.corp_name_eng || null,
    stock_name: c.stock_name || null,
    stock_code: c.stock_code?.trim() || null,
    market: MARKET[c.corp_cls] ?? c.corp_cls,
    market_raw: c.corp_cls,
    ceo_name: c.ceo_nm,
    corporate_registration_number: c.jurir_no,
    business_registration_number: c.bizr_no,
    address: c.adres,
    homepage: c.hm_url || null,
    ir_url: c.ir_url || null,
    phone: c.phn_no || null,
    fax: c.fax_no || null,
    industry_code: c.induty_code,
    established_date: c.est_dt,
    fiscal_year_end_month: c.acc_mt,
  };
};
