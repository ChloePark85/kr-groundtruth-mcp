import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
import { TOOLS } from "@/lib/tools/registry";
import { EXAMPLES_WORKFLOWS } from "@/lib/examples";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = config.publicUrl();
  const now = new Date();
  return [
    { url: base, lastModified: now, priority: 1 },
    { url: `${base}/tools`, lastModified: now, priority: 0.9 },
    { url: `${base}/examples`, lastModified: now, priority: 0.9 },
    ...EXAMPLES_WORKFLOWS.map((e) => ({ url: `${base}/examples/${e.slug}`, lastModified: now, priority: 0.85 })),
    ...TOOLS.map((t) => ({ url: `${base}/tools/${t.name}`, lastModified: now, priority: 0.8 })),
    { url: `${base}/llms.txt`, lastModified: now, priority: 0.7 },
    { url: `${base}/openapi.json`, lastModified: now, priority: 0.6 },
    { url: `${base}/pricing.json`, lastModified: now, priority: 0.6 },
  ];
}
