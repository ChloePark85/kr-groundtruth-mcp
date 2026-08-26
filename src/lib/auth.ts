import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./errors";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_PREFIX = "kgt_live_";

export interface AuthContext {
  accountId: string;
  keyId: string;
  scopes: string[];
}

export const hashKey = (plain: string) => createHash("sha256").update(plain).digest("hex");

export const generateApiKey = () => {
  const bytes = randomBytes(32);
  let body = "";
  for (const b of bytes) body += ALPHABET[b % ALPHABET.length];
  const plain = KEY_PREFIX + body;
  return { plain, prefix: plain.slice(0, KEY_PREFIX.length + 6), hash: hashKey(plain) };
};

export const extractBearer = (req: Request): string | undefined => {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || req.headers.get("x-api-key")?.trim() || undefined;
};

export const verifyApiKey = async (token: string | undefined): Promise<AuthContext | undefined> => {
  if (!token || !token.startsWith(KEY_PREFIX)) return undefined;
  const { data, error } = await db()
    .from("api_keys")
    .select("id, account_id, scopes, revoked_at")
    .eq("key_hash", hashKey(token))
    .maybeSingle();
  if (error) throw new ApiError(500, "DB_ERROR", error.message);
  if (!data || data.revoked_at) return undefined;
  // fire-and-forget last_used_at
  void db().from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { accountId: data.account_id, keyId: data.id, scopes: data.scopes ?? [] };
};

/** For REST routes: throws 401 when missing/invalid. */
export const requireAuth = async (req: Request): Promise<AuthContext> => {
  const auth = await verifyApiKey(extractBearer(req));
  if (!auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Provide a valid API key: Authorization: Bearer kgt_live_...", {
      signup: "POST /v1/accounts {\"email\"}",
    });
  }
  return auth;
};
