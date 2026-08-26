import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = config.publicUrl();
  return {
    rules: [{ userAgent: "*", allow: ["/", "/tools", "/llms.txt", "/openapi.json", "/pricing.json"], disallow: ["/pay/", "/v1/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
