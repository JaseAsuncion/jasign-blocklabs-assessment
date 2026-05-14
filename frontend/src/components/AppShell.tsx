import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { JasignWordmark } from "./JasignBrand";

const year = new Date().getFullYear();

export function AppShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { session, loading, signOut } = useAuth();

  return (
    <div className="app-root">
      <header className="app-header">
        <div className={`container${wide ? " container--wide" : ""}`} style={{ padding: "14px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <JasignWordmark />
            </Link>
            <nav
              className="row"
              style={{ justifyContent: "flex-end", flexWrap: "wrap", marginLeft: "auto" }}
            >
              {session ? (
                <>
                  <Link className="btn btn-ghost" to="/">
                    Upload
                  </Link>
                  <Link className="btn btn-ghost" to="/dashboard">
                    Dashboard
                  </Link>
                  <span
                    className="muted"
                    style={{
                      fontSize: 13,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={session.user.email ?? undefined}
                  >
                    {session.user.email}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
                    Sign out
                  </button>
                </>
              ) : loading ? (
                <span className="muted" style={{ fontSize: 13 }}>
                  …
                </span>
              ) : (
                <>
                  <Link className="btn btn-ghost" to="/login">
                    Log in
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className={`container${wide ? " container--wide" : ""}`} style={{ padding: "28px 0 40px" }}>
        {children}
      </main>
      <footer className="app-footer">
        <div className={`container${wide ? " container--wide" : ""}`}>
          <div className="app-footer-inner">
            <span>© {year} Jasign</span>
            <span className="app-footer-sep" aria-hidden>
              |
            </span>
            <span>PDF E-signatures — All rights reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
