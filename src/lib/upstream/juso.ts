import { config } from "../config";
import { upstreamFetch, UpstreamError } from "./http";

const SOURCE = "행정안전부 도로명주소 (juso.go.kr)";

interface Juso {
  roadAddr: string;
  roadAddrPart1: string;
  roadAddrPart2?: string;
  jibunAddr: string;
  engAddr: string;
  zipNo: string;
  admCd: string;
  rnMgtSn: string;
  bdMgtSn: string;
  bdNm?: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
  liNm?: string;
  rn: string;
  udrtYn: string;
  buldMnnm: string;
  buldSlno: string;
  mtYn: string;
  lnbrMnnm: string;
  lnbrSlno: string;
}

export const jusoSearch = async (keyword: string, page = 1, perPage = 10) => {
  const qs = new URLSearchParams({
    confmKey: config.upstream.jusoKey(),
    currentPage: String(page),
    countPerPage: String(perPage),
    keyword,
    resultType: "json",
  });
  const res = await upstreamFetch<{
    results: { common: { errorCode: string; errorMessage: string; totalCount: string }; juso: Juso[] | null };
  }>(SOURCE, `https://business.juso.go.kr/addrlink/addrLinkApi.do?${qs}`);
  const { common, juso } = res.results;
  if (common.errorCode !== "0") throw new UpstreamError(SOURCE, common.errorMessage, { code: common.errorCode });
  return {
    source: SOURCE,
    total: Number(common.totalCount),
    page,
    results: (juso ?? []).map((j) => ({
      road_address: j.roadAddr,
      road_address_main: j.roadAddrPart1,
      road_address_detail: j.roadAddrPart2 || null,
      jibun_address: j.jibunAddr,
      english_address: j.engAddr,
      postal_code: j.zipNo,
      adm_code: j.admCd,
      lawd_code: j.admCd.slice(0, 5),
      building_name: j.bdNm || null,
      sido: j.siNm,
      sigungu: j.sggNm,
      eupmyeondong: j.emdNm,
      ri: j.liNm || null,
      road_name: j.rn,
      building_main_no: j.buldMnnm,
      building_sub_no: j.buldSlno,
      is_underground: j.udrtYn === "1",
      is_mountain_lot: j.mtYn === "1",
      lot_main_no: j.lnbrMnnm,
      lot_sub_no: j.lnbrSlno,
      road_mgmt_no: j.rnMgtSn,
      building_mgmt_no: j.bdMgtSn,
    })),
  };
};
