import { createHash } from "node:crypto";
import { db } from "./db";

const canonical = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
};

export const requestHash = (tool: string, args: unknown) =>
  createHash("sha256").update(`${tool}:${canonical(args)}`).digest("hex");

export const cacheGet = async <T>(hash: string): Promise<T | null> => {
  const { data } = await db()
    .from("response_cache")
    .select("body, expires_at")
    .eq("hash", hash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return (data?.body as T) ?? null;
};

export const cacheSet = async (hash: string, tool: string, body: unknown, ttlSec: number) => {
  if (ttlSec <= 0) return;
  await db().from("response_cache").upsert({
    hash,
    tool_name: tool,
    body,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  });
};
