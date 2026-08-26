import { getPricing } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const GET = async () =>
  Response.json(await getPricing(), { headers: { "cache-control": "public, max-age=60", "access-control-allow-origin": "*" } });
