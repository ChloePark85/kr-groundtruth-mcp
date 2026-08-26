import { createMcpHandler, withMcpAuth } from "mcp-handler";
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
            return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED" } }) }] };
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

const verifyToken = async (_req: Request, bearer?: string): Promise<AuthInfo | undefined> => {
  const auth = await verifyApiKey(bearer);
  if (!auth) return undefined;
  return { token: bearer!, clientId: auth.accountId, scopes: auth.scopes, extra: { accountId: auth.accountId, keyId: auth.keyId, scopes: auth.scopes } };
};

const authed = withMcpAuth(handler, verifyToken, { required: true, resourceUrl: `${config.publicUrl()}/api/mcp` });

/**
 * Accept the API key as `x-api-key: kgt_live_…`, `Authorization: kgt_live_…` (no Bearer),
 * or `?apiKey=` in addition to `Authorization: Bearer …`, by normalizing to the bearer form.
 * Registries/gateways (e.g. Smithery config → header) don't always add the Bearer prefix.
 */
const normalized = async (req: Request) => {
  const auth = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const candidate =
    (/^Bearer\s+/i.test(auth) ? null : auth.trim()) ||
    req.headers.get("x-api-key")?.trim() ||
    url.searchParams.get("apiKey")?.trim() ||
    url.searchParams.get("api_key")?.trim();
  if (candidate && candidate.startsWith("kgt_")) {
    const headers = new Headers(req.headers);
    headers.set("authorization", `Bearer ${candidate}`);
    req = new Request(req, { headers });
  }
  return authed(req);
};

export { normalized as GET, normalized as POST, normalized as DELETE };
