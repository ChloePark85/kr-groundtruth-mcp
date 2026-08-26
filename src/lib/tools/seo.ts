/** Search-query-shaped titles and copy for tool landing pages (GEO). */
export interface ToolSeo {
  title: string;
  titleEn: string;
  keywords: string[];
  problem: string;
  useCases: string[];
  exampleArgs: Record<string, unknown>;
  related: string[];
}

export const TOOL_SEO: Record<string, ToolSeo> = {
  verify_business_registration: {
    title: "사업자등록번호 조회 API — 계속사업자/휴업/폐업 상태 확인, 진위확인",
    titleEn: "Korean Business Registration Number Verification API (status + validation)",
    keywords: ["사업자등록번호 조회 API", "사업자등록 진위확인 API", "휴폐업 조회", "국세청 사업자 상태조회", "Korea business registration API", "사업자번호 검증"],
    problem: "거래처·입점 셀러·계약 상대방의 사업자등록번호가 실제 등록되어 있고 영업 중인지, 대표자명·개업일이 일치하는지를 에이전트가 직접 확인할 방법이 없습니다. 국세청 원본 데이터를 정규화된 JSON으로 반환합니다.",
    useCases: ["입점/가입 심사 자동화 (KYB)", "세금계산서 발행 전 거래처 상태 확인", "계약서 작성 전 상대방 사업자 검증", "CRM 데이터 정리 (폐업 거래처 필터링)"],
    exampleArgs: { business_numbers: ["124-81-00998", "123-45-67890"] },
    related: ["lookup_corporation", "search_address"],
  },
  search_address: {
    title: "주소 정규화 API — 도로명주소·우편번호·법정동코드 변환",
    titleEn: "Korean Address Normalization API (road address, postal code, legal-dong code)",
    keywords: ["주소 정규화 API", "우편번호 조회 API", "도로명주소 API", "법정동코드 조회", "지번 도로명 변환", "Korean address API", "postal code Korea"],
    problem: "사용자가 입력한 지번·건물명·불완전한 주소를 공식 도로명주소, 우편번호(5자리), 행정구역코드, 영문주소로 바꿔야 합니다. 실거래가 조회에 필요한 법정동코드 5자리(lawd_code)도 함께 반환합니다.",
    useCases: ["배송지/청구지 정규화", "영문 주소 생성 (해외 발송)", "부동산·상권 분석 전 지역코드 확보", "회원 DB 주소 클렌징"],
    exampleArgs: { keyword: "테헤란로 152", per_page: 2 },
    related: ["apartment_trade_prices", "verify_business_registration"],
  },
  search_corporation: {
    title: "법인 검색 API — 회사명으로 DART 고유번호·종목코드 찾기",
    titleEn: "Korean Corporation Search API (DART corp_code by company name)",
    keywords: ["법인 검색 API", "DART 고유번호 조회", "회사명 종목코드 조회", "상장사 검색 API", "Korean company lookup by name"],
    problem: "회사 이름만 알고 있을 때 금융감독원 DART에 등록된 정식 법인과 8자리 고유번호(corp_code), 상장 여부·종목코드를 찾습니다. 기업개황 조회의 첫 단계입니다.",
    useCases: ["회사명 → 정식 법인명 매핑", "상장사 여부 판별", "경쟁사/거래처 리스트 정규화"],
    exampleArgs: { name: "카카오", limit: 2 },
    related: ["lookup_corporation"],
  },
  lookup_corporation: {
    title: "기업정보 조회 API — 대표자·법인등록번호·사업자번호·주소·설립일 (DART 기업개황)",
    titleEn: "Korean Company Profile API (CEO, corporate registration no., address — DART)",
    keywords: ["기업정보 조회 API", "법인등록번호 조회", "DART 기업개황 API", "회사 대표자 조회", "Korean corporate registry API", "company profile Korea"],
    problem: "법인의 공식 프로필(정식 법인명, 대표자, 법인등록번호, 사업자등록번호, 본점 주소, 업종코드, 설립일, 상장시장)이 필요합니다. 금융감독원 DART 원본을 그대로 정규화합니다.",
    useCases: ["B2B 온보딩 시 법인 정보 자동 채움", "계약서 당사자 정보 검증", "투자·리서치용 기업 프로필 수집"],
    exampleArgs: { corp_code: "00126380" },
    related: ["search_corporation", "verify_business_registration"],
  },
  apartment_trade_prices: {
    title: "아파트 실거래가 조회 API — 시군구·월별 매매 거래 내역 (국토교통부)",
    titleEn: "Korean Apartment Transaction Price API (MOLIT real transaction data)",
    keywords: ["아파트 실거래가 API", "부동산 실거래가 조회", "국토교통부 실거래가 API", "아파트 매매가 조회", "Korea apartment price API", "real estate transaction Korea"],
    problem: "특정 시군구의 월별 아파트 매매 실거래 내역(단지명, 거래금액, 전용면적, 층, 건축년도, 계약일, 해제 여부)이 필요합니다. 금액은 원 단위 정수로 변환해 계산에 바로 쓸 수 있습니다.",
    useCases: ["시세 비교·감정 보조", "부동산 리포트 자동 생성", "임대차 계약 전 주변 시세 확인", "지역별 거래량 모니터링"],
    exampleArgs: { lawd_code: "11680", deal_month: "202507", per_page: 2 },
    related: ["search_address"],
  },
  search_law: {
    title: "법령 검색 API — 현행 법률·시행령·시행규칙 조회 (법제처 국가법령정보)",
    titleEn: "Korean Law Search API (current statutes — Ministry of Government Legislation)",
    keywords: ["법령 검색 API", "국가법령정보 API", "현행법령 조회", "법제처 API", "Korean law API", "statute search Korea"],
    problem: "법령명으로 현행 법률과 하위 법령을 찾고, 소관부처·공포일·시행일·상세 링크를 확인합니다. 법률 답변 전 근거 법령의 존재와 최신 개정 여부를 확인하는 용도입니다.",
    useCases: ["리걸 어시스턴트의 근거 법령 확인", "규제 변경 모니터링 (시행일 추적)", "계약서·약관 검토 시 관련 법령 링크 제공"],
    exampleArgs: { query: "주택임대차보호법", per_page: 2 },
    related: ["lookup_corporation"],
  },
  get_balance: {
    title: "잔액 조회 — 현재 API 키의 크레딧 (무료)",
    titleEn: "Get credit balance (free)",
    keywords: ["credit balance"],
    problem: "에이전트가 남은 크레딧과 충전 방법을 확인합니다.",
    useCases: ["작업 전 잔액 확인", "402 발생 전 사전 충전 요청"],
    exampleArgs: {},
    related: ["get_pricing"],
  },
  get_pricing: {
    title: "가격표 조회 — 툴별 크레딧 비용 (무료)",
    titleEn: "Get pricing (free)",
    keywords: ["pricing"],
    problem: "툴별 비용, 크레딧 단가, 충전 패키지를 기계가독 형식으로 반환합니다.",
    useCases: ["비용 추정", "툴 선택 전 가격 비교"],
    exampleArgs: {},
    related: ["get_balance"],
  },
};
