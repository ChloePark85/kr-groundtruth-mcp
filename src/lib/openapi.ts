import { z } from "zod";
import { config } from "./config";
import { fullDescription, TOOLS } from "./tools/registry";

export const buildOpenApi = () => {
  const base = config.publicUrl();
  const paths: Record<string, unknown> = {
    "/v1/accounts": {
      post: {
        operationId: "createAccount",
        summary: "Create account + first API key (no human needed). Grants signup bonus credits.",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } } } } },
        responses: { "201": { description: "api_key is shown once" } },
      },
    },
    "/v1/me": { get: { operationId: "getMe", summary: "Balance + recent usage", responses: { "200": { description: "ok" } } } },
    "/v1/keys": {
      post: { operationId: "createKey", summary: "Issue an additional API key", responses: { "201": { description: "ok" } } },
      delete: { operationId: "revokeKey", summary: "Revoke a key by id", requestBody: { content: { "application/json": { schema: { type: "object", properties: { key_id: { type: "string" } } } } } }, responses: { "200": { description: "ok" } } },
    },
    "/v1/topups": {
      post: {
        operationId: "createTopup",
        summary: "Create a top-up order; returns checkout_url for a human to pay",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["credits"], properties: { credits: { type: "integer", minimum: config.minTopupCredits } } } } } },
        responses: { "201": { description: "ok" } },
      },
    },
  };
  for (const t of TOOLS) {
    paths[`/v1/tools/${t.name}`] = {
      post: {
        operationId: t.name,
        summary: t.title,
        description: fullDescription(t),
        "x-credits": t.credits,
        requestBody: { required: true, content: { "application/json": { schema: z.toJSONSchema(t.input, { io: "input" }) } } },
        responses: {
          "200": { description: "Envelope {ok, data, meta:{cost, balance_remaining, cache_hit, source}}" },
          "402": { description: "INSUFFICIENT_CREDITS — includes balance, required, topup_url" },
        },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Korea Ground-Truth API",
      version: config.serverVersion,
      description:
        "Fact-verification tools for AI agents working on Korean data: business registration, addresses, corporations, apartment prices, laws. Prepaid credits, per-call metering. MCP endpoint: " +
        `${base}/api/mcp`,
    },
    servers: [{ url: base }],
    security: [{ apiKey: [] }],
    components: { securitySchemes: { apiKey: { type: "http", scheme: "bearer", description: "API key kgt_live_..." } } },
    paths,
  };
};
