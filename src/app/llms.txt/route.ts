import { config } from "@/lib/config";
import { costLine, TOOLS } from "@/lib/tools/registry";

export const GET = () => {
  const base = config.publicUrl();
  const text = `# Korea Ground-Truth API

> Fact-verification tools for AI agents working with Korean data. Business registration status (국세청), address normalization + postal/legal-dong codes (행안부), corporation profiles (DART), apartment transaction prices (국토부), current laws (법제처). Prepaid credits, per-call metering, no human required to get started.

## Quick start (agent-only, ~10 seconds)

1. Create an account and key (grants ${config.signupBonusCredits} free credits):
   curl -X POST ${base}/v1/accounts -H 'content-type: application/json' -d '{"email":"you@example.com"}'
2. Use it via MCP (Streamable HTTP):
   claude mcp add --transport http kgt ${base}/api/mcp --header "Authorization: Bearer kgt_live_..."
   or REST: curl -X POST ${base}/v1/tools/search_address -H "Authorization: Bearer kgt_live_..." -H 'content-type: application/json' -d '{"keyword":"세종대로 209"}'
3. Every response includes meta.cost and meta.balance_remaining. When you get 402 INSUFFICIENT_CREDITS:
   curl -X POST ${base}/v1/topups -H "Authorization: Bearer kgt_live_..." -d '{"credits":500}'  → checkout_url → give it to a human to pay by card. (Humans can also pay directly at ${base}/topup with the API key.)

## Tools
${TOOLS.map((t) => `- [${t.name}](${base}/tools/${t.name}) — ${costLine(t)} ${t.description}`).join("\n")}

## Pricing
1 credit = ${config.creditKrw} KRW. Live table: ${base}/pricing.json

## Specs
- OpenAPI: ${base}/openapi.json
- MCP endpoint: ${base}/api/mcp (Streamable HTTP, bearer API key)
- Account: GET ${base}/v1/me (balance, usage, ledger)
- Upstream failures are refunded automatically.
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
};
