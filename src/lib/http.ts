import { NextResponse } from "next/server";
import { toApiError } from "./errors";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export const handle =
  (fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) =>
  async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      const err = toApiError(e);
      if (err.status >= 500) console.error(err);
      return json(err.toJSON(), err.status);
    }
  };

export const readJson = async <T = Record<string, unknown>>(req: Request): Promise<T> => {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
};

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
