import { buildOpenApi } from "@/lib/openapi";

export const GET = () =>
  Response.json(buildOpenApi(), { headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" } });
