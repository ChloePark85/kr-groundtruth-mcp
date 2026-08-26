import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

let client: SupabaseClient | null = null;

/** Service-role client. Never expose to the browser. */
export const db = (): SupabaseClient => {
  if (!client) {
    client = createClient(config.supabaseUrl(), config.supabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
};
