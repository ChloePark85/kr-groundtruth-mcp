import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { handle, json } from "@/lib/http";

const authorized = (req: Request) => {
  const expected = process.env.ADMIN_TOKEN;
  const got = req.headers.get("x-admin-token") ?? "";
  if (!expected || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
};

/** GET /v1/admin/metrics?days=7&include_test=1  (header: x-admin-token) */
export const GET = handle(async (req) => {
  if (!authorized(req)) throw new ApiError(401, "UNAUTHORIZED", "x-admin-token required");
  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 7), 1), 365);
  const excludeTest = url.searchParams.get("include_test") !== "1";
  const { data, error } = await db().rpc("metrics_report", { p_days: days, p_exclude_test: excludeTest });
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return json(data);
});
