# Korea Ground-Truth MCP

Headless, AI-native SaaS whose customer is an **AI agent**. Exposes Korean fact-verification tools over MCP (Streamable HTTP) and REST, metered with prepaid credits.

| Tool | Source | Credits |
|---|---|---|
| `verify_business_registration` | 국세청 (data.go.kr) | 2 |
| `search_address` | 행안부 juso.go.kr | 1 |
| `search_corporation` / `lookup_corporation` | DART | 1 / 2 |
| `apartment_trade_prices` | 국토교통부 (data.go.kr) | 3 |
| `search_law` | 법제처 law.go.kr | 2 |
| `get_balance`, `get_pricing` | internal | free |

**Live**: https://kr-groundtruth-mcp.vercel.app — `/llms.txt`, `/openapi.json`, `/pricing.json`. MCP endpoint: `/api/mcp`.

```
claude mcp add --transport http kgt https://kr-groundtruth-mcp.vercel.app/api/mcp --header "Authorization: Bearer kgt_live_..."
```

## Stack
Next.js 16 (App Router) · `mcp-handler` 2 (MCP SDK v2, stateless) · Supabase Postgres · Toss Payments · Vercel.

## Infra
- Supabase project `kr-groundtruth-mcp` (ref `kzjzjahokqduktphxpsj`, ap-northeast-2)
- Vercel project `chloepark85s-projects/kr-groundtruth-mcp`; env vars set for production (`vercel env ls`)
- MCP registry manifest: `server.json` (publish with `mcp-publisher` after GitHub login)

## Setup
1. Supabase project → run `supabase/migrations/0001_core.sql` in the SQL editor (or `supabase db push`).
2. Copy `.env.example` → `.env.local`, fill keys:
   - `DATA_GO_KR_KEY`: data.go.kr에서 「국세청_사업자등록정보 진위확인 및 상태조회」, 「국토교통부_아파트 매매 실거래가」 활용신청 (자동승인)
   - `JUSO_KEY`: business.juso.go.kr 승인키 신청
   - `DART_KEY`: opendart.fss.or.kr 인증키
   - `LAW_OC`: law.go.kr OPEN API 신청 (관리자 승인 1~2일)
   - `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY`: 토스페이먼츠 테스트 키
3. `npm run dev`
4. DART name search needs the corp code list: `npx tsx scripts/sync-dart-corp-codes.ts` (re-run monthly).

## Flow
```
POST /v1/accounts {email}            → api_key (once) + 50 free credits
claude mcp add --transport http kgt $URL/api/mcp --header "Authorization: Bearer kgt_live_..."
tools/call → debit_credits (row-locked) → cache → upstream → {ok, data, meta:{cost, balance_remaining}}
402 INSUFFICIENT_CREDITS → POST /v1/topups {credits} → checkout_url → human pays (Toss) → credit_credits (idempotent)
```

## Design notes
- `src/lib/tools/registry.ts` is the single source for MCP tools, REST routes, OpenAPI, pricing and llms.txt. Prices are also seeded into `tool_prices`; the DB row is what `debit_credits` charges.
- Debit before upstream call; upstream failure → automatic refund (`credit_ledger.reason='refund'`).
- `credit_ledger` is append-only (trigger) with `unique(reason, ref_id)`, so Toss success-redirect and webhook can both run safely.
- All tables have RLS enabled with no policies; only the service-role key (server) can access them.

## Metrics
- `npm run metrics [-- --days 7 --include-test]` — weekly report (north star = Weekly Active API Keys; funnel created → first call → 2nd-day call → 402 → top-up; time-to-first-call; calls by tool; revenue). Test accounts (`@example.com`) excluded unless `--include-test`.
- `GET /v1/admin/metrics?days=7` with header `x-admin-token: $ADMIN_TOKEN` returns the same JSON (`metrics_report()` in `supabase/migrations/0002_metrics.sql`).

## Verification checklist
```bash
H=http://localhost:3000
curl -X POST $H/v1/accounts -H 'content-type: application/json' -d '{"email":"a@b.com"}'
K=kgt_live_...
curl -X POST $H/api/mcp -H "Authorization: Bearer $K" -H 'accept: application/json, text/event-stream' -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
curl -X POST $H/v1/tools/search_address -H "Authorization: Bearer $K" -H 'content-type: application/json' -d '{"keyword":"세종대로 209"}'
# race test: 50 concurrent calls on a low balance → ledger sum == balance
seq 50 | xargs -P 50 -I{} curl -s -o /dev/null -w '%{http_code}\n' -X POST $H/v1/tools/search_address -H "Authorization: Bearer $K" -H 'content-type: application/json' -d '{"keyword":"테스트 {}"}' | sort | uniq -c
```
