import { createMcpHandler } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { config } from "@/lib/config";
import { verifyApiKey } from "@/lib/auth";
import { executeTool } from "@/lib/pipeline";
import { toApiError } from "@/lib/errors";
import { fullDescription, TOOLS } from "@/lib/tools/registry";

const INSTRUCTIONS = `Korea Ground-Truth: 한국 시장 사실 검증 툴 (사업자등록, 주소, 법인, 아파트 실거래가, 법령).
- 모든 유료 툴은 호출 시 크레딧이 차감됩니다. 각 툴 설명의 "Cost:" 줄을 확인하세요.
- 응답 meta.balance_remaining으로 잔액을 추적하세요. get_balance / get_pricing 은 무료입니다.
- 잔액 부족(INSUFFICIENT_CREDITS) 시 POST ${config.publicUrl()}/v1/topups {"credits": N} 로 checkout_url을 받아 사람 운영자에게 결제를 요청하세요.
- 업스트림 실패 시 자동 환불(refunded: true)됩니다.`;

const handler = createMcpHandler(
  (server) => {
    for (const t of TOOLS) {
      server.registerTool(
        t.name,
        {
          title: t.title,
          description: fullDescription(t),
          inputSchema: t.input,
          annotations: { readOnlyHint: true, openWorldHint: true },
          _meta: { cost_credits: t.credits, cache_hit_credits: t.cacheHitCredits, source: t.source },
        },
        async (args: unknown, ctx: { http?: { authInfo?: AuthInfo } }) => {
          const extra = ctx.http?.authInfo?.extra as { accountId?: string; keyId?: string; scopes?: string[] } | undefined;
          if (!extra?.accountId || !extra.keyId) {
            const err = {
              ok: false,
              error: {
                code: "UNAUTHORIZED",
                message: "This tool needs an API key. Get one free (50 credits) then reconnect with Authorization: Bearer kgt_live_... (or x-api-key).",
                get_key: `curl -X POST ${config.publicUrl()}/v1/accounts -H 'content-type: application/json' -d '{"email":"you@example.com"}'`,
                docs: `${config.publicUrl()}/llms.txt`,
              },
            };
            return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(err) }] };
          }
          try {
            const env = await executeTool(t.name, args, { accountId: extra.accountId, keyId: extra.keyId, scopes: extra.scopes ?? [] });
            return { content: [{ type: "text" as const, text: JSON.stringify(env) }], structuredContent: env as unknown as Record<string, unknown> };
          } catch (e) {
            const err = toApiError(e);
            return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(err.toJSON()) }] };
          }
        },
      );
    }
  },
  {
    serverInfo: { name: config.serverName, version: config.serverVersion },
    instructions: INSTRUCTIONS,
    verboseLogs: process.env.NODE_ENV === "development",
  },
);

/**
 * API-key gate. We deliberately do NOT use withMcpAuth: it advertises an OAuth
 * protected-resource metadata URL in WWW-Authenticate, which makes registries
 * (Smithery, Claude connectors) attempt OAuth discovery against a server that
 * only speaks API keys. Accepts: Authorization: Bearer <key> | Authorization: <key>
 * | x-api-key: <key> | ?apiKey= / ?api_key=.
 */
const extractKey = (req: Request) => {
  const auth = (req.headers.get("authorization") ?? "").trim();
  const url = new URL(req.url);
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim();
  return bearer || auth || req.headers.get("x-api-key")?.trim() || url.searchParams.get("apiKey")?.trim() || url.searchParams.get("api_key")?.trim() || undefined;
};

const unauthorized = (message: string) =>
  Response.json(
    { error: "unauthorized", error_description: message, how_to_get_a_key: `POST ${config.publicUrl()}/v1/accounts {"email"} → api_key (50 free credits)`, docs: `${config.publicUrl()}/llms.txt` },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="kr-groundtruth", error="invalid_token"' } },
  );

/**
 * Discovery (initialize, tools/list, ping…) is public so registries and agents can
 * inspect tools before signing up. Only tools/call needs a valid key; a missing key
 * there returns an isError result explaining how to get one. An invalid key is 401.
 */
const gated = async (req: Request) => {
  const key = extractKey(req);
  if (key) {
    const auth = await verifyApiKey(key);
    if (!auth) return unauthorized("Invalid or revoked API key.");
    const info: AuthInfo = { token: key, clientId: auth.accountId, scopes: auth.scopes, extra: { accountId: auth.accountId, keyId: auth.keyId, scopes: auth.scopes } };
    (req as Request & { auth?: AuthInfo }).auth = info; // mcp-handler reads ctx.http.authInfo from req.auth
  }
  return handler(req);
};

export { gated as GET, gated as POST, gated as DELETE };
