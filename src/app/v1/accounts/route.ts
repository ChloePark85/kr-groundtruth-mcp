import { z } from "zod";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { generateApiKey } from "@/lib/auth";
import { credit } from "@/lib/billing";
import { clientIp, handle, json, readJson } from "@/lib/http";

const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com", "sharklasers.com", "trashmail.com"]);

const Body = z.object({ email: z.string().email().max(200), name: z.string().max(100).optional() });

export const POST = handle(async (req) => {
  const body = Body.safeParse(await readJson(req));
  if (!body.success) throw new ApiError(400, "INVALID_ARGUMENTS", "email required", { issues: body.error.issues });
  const email = body.data.email.toLowerCase();
  if (DISPOSABLE.has(email.split("@")[1])) throw new ApiError(400, "DISPOSABLE_EMAIL", "Disposable email domains are not allowed");

  const ip = clientIp(req);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db().from("accounts").select("id", { count: "exact", head: true }).eq("signup_ip", ip).gte("created_at", since);
  if ((count ?? 0) >= config.signupsPerIpPerDay) throw new ApiError(429, "RATE_LIMITED", "Too many signups from this IP today");

  const { data: account, error } = await db().from("accounts").insert({ email, signup_ip: ip }).select("id").single();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "EMAIL_EXISTS", "Account exists. Use your existing key or POST /v1/keys with it.");
    throw new ApiError(500, "DB_ERROR", error.message);
  }

  const key = generateApiKey();
  const { error: kerr } = await db().from("api_keys").insert({ account_id: account.id, name: body.data.name ?? "default", key_prefix: key.prefix, key_hash: key.hash });
  if (kerr) throw new ApiError(500, "DB_ERROR", kerr.message);
  const { balance } = await credit(account.id, config.signupBonusCredits, "signup_bonus", account.id);

  return json(
    {
      ok: true,
      account_id: account.id,
      api_key: key.plain,
      note: "Store this key now; it is not shown again.",
      balance,
      mcp_url: `${config.publicUrl()}/api/mcp`,
      usage: `Authorization: Bearer ${key.plain}`,
      pricing_url: `${config.publicUrl()}/pricing.json`,
    },
    201,
  );
});
