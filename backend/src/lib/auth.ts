import { createClient } from "@supabase/supabase-js";
import type { AppEnv } from "../env";

export type AuthUser = { id: string; email: string | null };

export async function requireBearerUser(
  request: Request,
  env: AppEnv,
): Promise<{ user: AuthUser } | { error: string; status: number }> {
  const raw = request.headers.get("authorization")?.trim() ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  if (!m?.[1]) {
    return { error: "Sign in required (missing Authorization bearer token)", status: 401 };
  }

  const jwt = m[1];
  const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser(jwt);
  if (error || !data.user) {
    return { error: error?.message ?? "Invalid or expired session", status: 401 };
  }

  return {
    user: { id: data.user.id, email: data.user.email ?? null },
  };
}
