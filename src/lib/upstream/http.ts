import { XMLParser } from "fast-xml-parser";
import { ApiError } from "../errors";

export class UpstreamError extends ApiError {
  constructor(source: string, message: string, details?: Record<string, unknown>) {
    super(502, "UPSTREAM_ERROR", `${source}: ${message}`, { source, ...details });
  }
}

export interface FetchOpts {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  as?: "json" | "xml" | "text";
}

const xml = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

/** fetch with timeout + one retry on network/5xx. */
export const upstreamFetch = async <T = unknown>(source: string, url: string, opts: FetchOpts = {}): Promise<T> => {
  const { method = "GET", headers = {}, body, timeoutMs = 8000, retries = 1, as = "json" } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "content-type": "application/json", ...headers } : headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
        cache: "no-store",
      });
      const text = await res.text();
      if (res.status >= 500) {
        lastErr = new UpstreamError(source, `HTTP ${res.status}`, { body: text.slice(0, 300) });
        continue;
      }
      if (!res.ok) throw new UpstreamError(source, `HTTP ${res.status}`, { body: text.slice(0, 300) });
      if (as === "text") return text as T;
      if (as === "xml") return xml.parse(text) as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        // some KR APIs return XML on error even when JSON requested
        const parsed = xml.parse(text);
        throw new UpstreamError(source, "non-JSON response", { body: parsed });
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      lastErr = new UpstreamError(source, e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
};

/** Returns array for values that may be a single object or array (XML quirk). */
export const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
