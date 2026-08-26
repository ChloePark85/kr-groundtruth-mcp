import { config } from "../config";
import { upstreamFetch, UpstreamError } from "./http";

const BASE = "https://api.odcloud.kr/api/nts-businessman/v1";
const SOURCE = "국세청 사업자등록정보 (data.go.kr)";

interface NtsStatus {
  b_no: string;
  b_stt: string;
  b_stt_cd: string;
  tax_type: string;
  tax_type_cd: string;
  end_dt: string;
  utcc_yn: string;
  tax_type_change_dt: string;
  invoice_apply_dt: string;
  rbf_tax_type: string;
  rbf_tax_type_cd: string;
}

const STATUS_MAP: Record<string, string> = { "01": "active", "02": "suspended", "03": "closed" };

export const normalizeStatus = (s: NtsStatus) => ({
  business_number: s.b_no,
  registered: s.b_stt_cd !== "" && s.b_stt_cd !== undefined,
  status: STATUS_MAP[s.b_stt_cd] ?? (s.b_stt ? "unknown" : "not_registered"),
  status_raw: s.b_stt || "국세청에 등록되지 않은 사업자등록번호입니다.",
  tax_type: s.tax_type,
  tax_type_code: s.tax_type_cd,
  closed_date: s.end_dt || null,
  unit_taxpayer: s.utcc_yn === "Y",
  tax_type_changed_date: s.tax_type_change_dt || null,
  e_invoice_apply_date: s.invoice_apply_dt || null,
});

export const ntsStatus = async (businessNumbers: string[]) => {
  const url = `${BASE}/status?serviceKey=${encodeURIComponent(config.upstream.dataGoKrKey())}`;
  const res = await upstreamFetch<{ status_code: string; data?: NtsStatus[]; match_cnt?: number }>(SOURCE, url, {
    method: "POST",
    body: { b_no: businessNumbers },
  });
  if (res.status_code !== "OK") throw new UpstreamError(SOURCE, `status_code=${res.status_code}`);
  return { source: SOURCE, results: (res.data ?? []).map(normalizeStatus) };
};

export interface NtsValidateInput {
  b_no: string;
  start_dt: string;
  p_nm: string;
  p_nm2?: string;
  b_nm?: string;
  corp_no?: string;
  b_sector?: string;
  b_type?: string;
  b_adr?: string;
}

export const ntsValidate = async (businesses: NtsValidateInput[]) => {
  const url = `${BASE}/validate?serviceKey=${encodeURIComponent(config.upstream.dataGoKrKey())}`;
  const res = await upstreamFetch<{
    status_code: string;
    data?: Array<{ b_no: string; valid: string; valid_msg?: string; status?: NtsStatus }>;
  }>(SOURCE, url, { method: "POST", body: { businesses } });
  if (res.status_code !== "OK") throw new UpstreamError(SOURCE, `status_code=${res.status_code}`);
  return {
    source: SOURCE,
    results: (res.data ?? []).map((d) => ({
      business_number: d.b_no,
      valid: d.valid === "01",
      valid_raw: d.valid_msg ?? (d.valid === "01" ? "확인" : "확인할 수 없습니다"),
      ...(d.status ? normalizeStatus(d.status) : {}),
    })),
  };
};
