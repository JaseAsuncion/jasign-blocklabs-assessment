import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { session, loading, signIn, signUp, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate(from === "/login" ? "/" : from, { replace: true });
  }, [session, loading, from, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const fn = mode === "signin" ? signIn : signUp;
    const res = await fn(email.trim(), password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (mode === "signup") {
      setInfo(
        "If email confirmation is enabled in Supabase, check your inbox before signing in.",
      );
    }
  }

  async function onForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await resetPasswordForEmail(email.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setInfo("Check your email for a reset link. It may take a minute to arrive.");
  }

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 440, margin: "0 auto" }}>
      <div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 28, letterSpacing: "-0.03em" }}>
          {showForgot ? "Forgot password" : "Sign in"}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {showForgot
            ? "Enter the email for your Jasign account and we will send you a link to choose a new password."
            : "To use Jasign, create an account or log in as a requester. After signing in, you can upload PDF documents and send signature requests."}
        </p>
      </div>

      {showForgot ? (
        <form onSubmit={onForgotSubmit} style={{ display: "grid", gap: 14 }}>
          <div className="field">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error ? (
            <div
              style={{
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}
          {info ? (
            <div
              style={{
                border: "1px solid #bae6fd",
                background: "#f0f9ff",
                color: "#0369a1",
                padding: 12,
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              {info}
            </div>
          ) : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setShowForgot(false);
              setError(null);
              setInfo(null);
            }}
          >
            ← Back to sign in
          </button>
        </form>
      ) : (
        <>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className={`btn ${mode === "signin" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setMode("signin");
                setError(null);
                setInfo(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`btn ${mode === "signup" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setMode("signup");
                setError(null);
                setInfo(null);
              }}
            >
              Create account
            </button>
          </div>

          <form className="card" onSubmit={onSubmit} style={{ padding: 18, display: "grid", gap: 14 }}>
            <div className="field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                className="input"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setError(null);
                  setInfo(null);
                }}
                style={{
                  alignSelf: "start",
                  margin: 0,
                  padding: 0,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--accent-2)",
                  font: "inherit",
                  fontSize: 14,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Forgot password?
              </button>
            ) : null}

            {error ? (
              <div
                style={{
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            ) : null}
            {info ? (
              <div
                style={{
                  border: "1px solid #bae6fd",
                  background: "#f0f9ff",
                  color: "#0369a1",
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 14,
                }}
              >
                {info}
              </div>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
