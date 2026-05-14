import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!url || !anon) {
  console.warn(
    "Jasign: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env (same project as the API).",
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
