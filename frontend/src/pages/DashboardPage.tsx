import { useEffect, useState } from "react";
import { listDocuments, type DashboardDocument } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

function statusPill(status: DashboardDocument["status"]) {
  return <span className={`pill ${status}`}>{status}</span>;
}

export function DashboardPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<DashboardDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const docs = await listDocuments();
        if (!cancelled) setRows(docs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const empty = !loading && rows.length === 0;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 34, letterSpacing: "-0.03em" }}>Dashboard</h1>
        <p className="muted" style={{ margin: 0, maxWidth: 760 }}>
          Documents you create while signed in appear here for your account.
        </p>
      </div>

      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800 }}>Your documents</div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void (async () => {
                setLoading(true);
                setError(null);
                try {
                  setRows(await listDocuments());
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to load");
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            Refresh
          </button>
        </div>

        {empty ? (
          <div className="muted" style={{ fontSize: 14 }}>
            No documents yet. Create a request from the upload page.
          </div>
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

        {loading ? <div className="muted">Loading…</div> : null}

        {!loading && rows.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((d) => (
              <div
                key={d.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                  background: "#fff",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 800 }}>{d.title}</div>
                  {statusPill(d.status)}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Signer: <strong style={{ color: "var(--text)" }}>{d.signer_name}</strong> ·{" "}
                  {d.signer_email}
                </div>
                <div className="row">
                  <a className="btn btn-ghost" href={d.pdf_url} target="_blank" rel="noreferrer">
                    View original
                  </a>
                  {d.status === "signed" && d.signed_pdf_url ? (
                    <a
                      className="btn btn-primary"
                      href={d.signed_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      download
                    >
                      Download signed PDF
                    </a>
                  ) : (
                    <span className="muted" style={{ fontSize: 13 }}>
                      Signed download appears after signing.
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      const url = `${window.location.origin}/sign/${d.token}`;
                      void navigator.clipboard.writeText(url);
                    }}
                  >
                    Copy signing link
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
