import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { generateApiKey, requireAuth } from "@/lib/auth";
import { handle, json, readJson } from "@/lib/http";

export const GET = handle(async (req) => {
  const auth = await requireAuth(req);
  const { data } = await db().from("api_keys").select("id, name, key_prefix, last_used_at, revoked_at, created_at").eq("account_id", auth.accountId).order("created_at");
  return json({ ok: true, keys: data ?? [] });
});

export const POST = handle(async (req) => {
  const auth = await requireAuth(req);
  const body = z.object({ name: z.string().max(100).default("key") }).parse(await readJson(req));
  const key = generateApiKey();
  const { data, error } = await db().from("api_keys").insert({ account_id: auth.accountId, name: body.name, key_prefix: key.prefix, key_hash: key.hash }).select("id").single();
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  return json({ ok: true, key_id: data.id, api_key: key.plain, note: "Shown once." }, 201);
});

export const DELETE = handle(async (req) => {
  const auth = await requireAuth(req);
  const body = z.object({ key_id: z.string().uuid() }).safeParse(await readJson(req));
  if (!body.success) throw new ApiError(400, "INVALID_ARGUMENTS", "key_id required");
  const { data, error } = await db().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", body.data.key_id).eq("account_id", auth.accountId).is("revoked_at", null).select("id");
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  if (!data?.length) throw new ApiError(404, "KEY_NOT_FOUND", "No active key with that id");
  return json({ ok: true, revoked: body.data.key_id });
});
