import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase-browser";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && alive) setReady(true);
    });

    function checkSession() {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!alive || !session) return;
        const hash = window.location.hash;
        if (hash.includes("type=recovery") || hash.includes("access_token")) setReady(true);
      });
    }
    checkSession();
    const t = window.setTimeout(checkSession, 400);

    return () => {
      alive = false;
      window.clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 1600);
  }

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 440, margin: "0 auto" }}>
      <div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 26, letterSpacing: "-0.03em" }}>Reset password</h1>
        <p className="muted" style={{ margin: 0 }}>
          Open this page from the link in your reset email, then choose a new password.
        </p>
      </div>

      {!ready ? (
        <div className="card" style={{ padding: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            Waiting for a valid recovery session… If nothing happens, request a new link from the
            login page and use the latest email. Confirm your Supabase project allows redirect to{" "}
            <code style={{ fontSize: 12 }}>{window.location.origin}/reset-password</code>.
          </p>
        </div>
      ) : done ? (
        <div className="card" style={{ padding: 18 }}>
          <p style={{ margin: 0, fontWeight: 650 }}>Password updated. Redirecting to sign in…</p>
        </div>
      ) : (
        <form className="card" onSubmit={onSubmit} style={{ padding: 18, display: "grid", gap: 14 }}>
          <div className="field">
            <label htmlFor="new-pass">New password</label>
            <input
              id="new-pass"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-pass">Confirm password</label>
            <input
              id="confirm-pass"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
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
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}

      <Link className="muted" to="/login" style={{ fontSize: 13 }}>
        ← Back to sign in
      </Link>
    </div>
  );
}
