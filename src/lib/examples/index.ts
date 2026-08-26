import traces from "./traces.json";

export interface Step { tool: string; args: Record<string, unknown>; response: { data: Record<string, unknown>; meta: { cost: number; balance_remaining: number; source: string } } }
export interface Example {
  slug: string;
  title: string;
  titleEn: string;
  prompt: string;
  chain: string[];
  answer: string[];
  why: string;
  steps: Step[];
}

const T = traces as Record<string, Step[]>;

export const EXAMPLES_WORKFLOWS: Example[] = [
  {
    slug: "company-verification",
    title: "거래처 검증 — 계약 전에 사업자·법인·주소를 한 번에",
    titleEn: "Verify a Korean company before you sign",
    prompt: "삼성전자(사업자번호 124-81-00998)랑 계약하려고 하는데 사업자 상태랑 법인정보, 주소 확인해줘.",
    chain: ["verify_business_registration", "search_corporation", "lookup_corporation", "search_address"],
    answer: [
      "✅ 사업자 상태: 계속사업자 (부가가치세 일반과세자) — 국세청",
      "✅ 법인: 삼성전자(주), DART 고유번호 00126380, KOSPI 005930",
      "✅ 대표자: 전영현, 노태문 · 법인등록번호 1301110006246 · 설립일 1969-01-13",
      "✅ 사업자번호 일치: DART 등록 1248100998 = 조회한 124-81-00998",
      "✅ 본점 주소 정규화: 경기도 수원시 영통구 삼성로 129 (매탄동), 우편번호 16677",
    ],
    why: "국세청·DART·행안부 세 기관의 데이터를 각각 붙이지 않아도 됩니다. 에이전트가 툴 4개를 순서대로 호출하고 교차 검증합니다. 총 비용 6 credits(60원).",
    steps: T["company-verification"],
  },
  {
    slug: "real-estate",
    title: "아파트 실거래가 — 단지명만으로 최근 거래 확인",
    titleEn: "Look up recent apartment transactions from just a name",
    prompt: "래미안 개포 루체하임 2025년 7월 실거래가 확인해줘.",
    chain: ["search_address", "apartment_trade_prices"],
    answer: [
      "📍 서울특별시 강남구 개포로110길 50 (일원동) — 법정동코드 11680",
      "🏠 2025-07-11 · 전용 84.97㎡ · 12층 · 33억 원 (중개거래)",
      "출처: 국토교통부 실거래가 (2025-07 강남구 전체 376건 중 해당 단지 1건)",
    ],
    why: "실거래가 API는 법정동코드 5자리가 필요합니다. 주소 검색이 lawd_code를 돌려주므로 에이전트가 사람에게 코드를 묻지 않습니다. 총 4 credits(40원).",
    steps: T["real-estate"],
  },
  {
    slug: "legal",
    title: "현행 법령 확인 — 답변 전에 시행일과 근거 법령 검증",
    titleEn: "Check the current statute before answering a legal question",
    prompt: "주택임대차보호법 지금 시행 중인 기준으로 찾아줘. 시행령도.",
    chain: ["search_law"],
    answer: [
      "📜 주택임대차보호법 (법률) — 국토교통부·법무부 · 시행 2026-01-02",
      "📜 주택임대차보호법 시행령 (대통령령) — 국토교통부·법무부 · 시행 2026-07-01",
      "각 항목에 법제처 상세 링크 포함 — 에이전트가 조문을 열어 인용할 수 있습니다.",
    ],
    why: "LLM이 기억하는 법령은 개정 전일 수 있습니다. 답변 전에 시행일과 법령ID를 확인하면 환각을 줄입니다. 2 credits(20원).",
    steps: T["legal"],
  },
];

export const getExample = (slug: string) => EXAMPLES_WORKFLOWS.find((e) => e.slug === slug);
