export type AppEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Public anon key — validates user JWTs from the SPA */
  SUPABASE_ANON_KEY: string;
  PORT: number;
  /** Allowed browser origins (comma-separated). Example: `https://app.vercel.app,https://app-xxx.vercel.app` */
  CORS_ORIGINS: string[];
  /** e.g. https://xxx.supabase.co/storage/v1/object/public */
  PUBLIC_STORAGE_BASE: string;
  /** Resend API key — when set, signer notification emails are sent from `/request-signature` */
  RESEND_API_KEY: string;
  /** From address for Resend (e.g. `Jasign <onboarding@resend.dev>`). Required for production domains. */
  EMAIL_FROM: string;
/** Public web app origin for links in emails (defaults to first entry in `CORS_ORIGIN` if empty) */
  PUBLIC_APP_URL: string;
};

export function readEnv(): AppEnv {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
  const PORT = Number(process.env.PORT ?? 3001);
  const CORS_ORIGIN_RAW = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  const PUBLIC_STORAGE_BASE = process.env.PUBLIC_STORAGE_BASE ?? "";
  const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() ?? "";
  const EMAIL_FROM = process.env.EMAIL_FROM?.trim() ?? "";
  const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL?.trim() ?? "";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env",
    );
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY in backend/.env (Supabase Dashboard → Project Settings → API → anon public)",
    );
  }
  if (!PUBLIC_STORAGE_BASE) {
    throw new Error(
      "Missing PUBLIC_STORAGE_BASE (public storage URL prefix) in backend/.env",
    );
  }

  const CORS_ORIGINS = CORS_ORIGIN_RAW.split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  return {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY,
    PORT,
    CORS_ORIGINS: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : ["http://localhost:5173"],
    PUBLIC_STORAGE_BASE: PUBLIC_STORAGE_BASE.replace(/\/$/, ""),
    RESEND_API_KEY,
    EMAIL_FROM,
    PUBLIC_APP_URL,
  };
}
