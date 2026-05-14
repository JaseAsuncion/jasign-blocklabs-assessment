import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppEnv } from "../env";

export function createServerClient(env: AppEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
