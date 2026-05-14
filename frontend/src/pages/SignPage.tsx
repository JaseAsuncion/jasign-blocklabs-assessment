import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getDocumentByToken, submitSignature, type DocumentPayload } from "../lib/api";
import { readDroppedImage } from "../lib/drag-files";
import {
  getTypeSignatureFont,
  TYPE_SIGNATURE_FONTS,
  type SignatureFontId,
} from "../lib/signature-fonts";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type Mode = "draw" | "type" | "upload";

const THUMB_W = 104;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dataUrlToBase64(dataUrl: string) {
  return dataUrl.includes(",") ? dataUrl.split(",", 2)[1]! : dataUrl;
}

export function SignPage() {
  const { token } = useParams();
  const [doc, setDoc] = useState<DocumentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  const [mode, setMode] = useState<Mode>("draw");
  const [typed, setTyped] = useState("Your Name");
  const [sigFontId, setSigFontId] = useState<SignatureFontId>("script");
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const sigDropDepth = useRef(0);
  const [sigDropActive, setSigDropActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);

  const [box, setBox] = useState({ x: 0.12, y: 0.72, w: 0.42, h: 0.12 });

  const drag = useRef<
    | { kind: "move"; sx: number; sy: number; bx: number; by: number }
    | { kind: "resize"; sx: number; sy: number; bw: number; bh: number }
    | null
  >(null);

  const viewerWellRef = useRef<HTMLDivElement | null>(null);
  const [viewerW, setViewerW] = useState(560);

  const pageMeta = doc?.pages[page - 1] ?? doc?.pages[0] ?? { width: 612, height: 792 };
  const displayH = useMemo(() => {
    return (viewerW * pageMeta.height) / pageMeta.width;
  }, [viewerW, pageMeta]);

  useEffect(() => {
    if (!token) return;
    setPage(1);
    setNumPages(0);
    setSigDataUrl(null);
    let cancelled = false;
    (async () => {
      try {
        const d = await getDocumentByToken(token);
        if (!cancelled) setDoc(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const el = viewerWellRef.current;
    if (!el) return;
    const well = el;
    function measure() {
      const w = well.getBoundingClientRect().width;
      setViewerW(Math.max(280, Math.min(780, Math.floor(w - 32))));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(well);
    return () => ro.disconnect();
  }, [doc?.pdf_url]);

  useEffect(() => {
    if (!sigDataUrl) return;
    setBox((b) => ({
      ...b,
      x: clamp(b.x, 0, 1 - b.w),
      y: clamp(b.y, 0, 1 - b.h),
      w: clamp(b.w, 0.08, 1),
      h: clamp(b.h, 0.04, 1),
    }));
  }, [sigDataUrl, viewerW, displayH]);

  function renderTypedSignature() {
    const text = typed.trim() || "Signature";
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const font = getTypeSignatureFont(sigFontId);
    ctx.font = font;
    const w = Math.min(900, Math.max(100, Math.ceil(ctx.measureText(text).width) + 48));
    const h = 110;
    c.width = w;
    c.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.fillStyle = "#0f172a";
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = 4;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 24, h / 2);
    ctx.shadowBlur = 0;
    setSigDataUrl(c.toDataURL("image/png"));
  }

  function sigDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("Files")) return;
    sigDropDepth.current += 1;
    setSigDropActive(true);
  }

  function sigDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    sigDropDepth.current = Math.max(0, sigDropDepth.current - 1);
    if (sigDropDepth.current === 0) setSigDropActive(false);
  }

  function sigDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  function sigDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    sigDropDepth.current = 0;
    setSigDropActive(false);
    const f = readDroppedImage(e.dataTransfer);
    if (f) onPickUpload(f);
  }

  function onPickUpload(file: File) {
    setUploadLabel(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result ?? "");
      setSigDataUrl(res);
    };
    reader.readAsDataURL(file);
  }

  function clearDrawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = 900;
    const h = 320;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    setSigDataUrl(null);
  }

  useEffect(() => {
    if (!sigDataUrl) setUploadLabel(null);
  }, [sigDataUrl]);

  useEffect(() => {
    if (mode !== "upload") {
      sigDropDepth.current = 0;
      setSigDropActive(false);
    }
  }, [mode]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const canvas = el;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = 900;
    const h = 320;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const brush = ctx;
    brush.setTransform(dpr, 0, 0, dpr, 0, 0);
    brush.clearRect(0, 0, w, h);
    brush.lineCap = "round";
    brush.lineJoin = "round";
    brush.strokeStyle = "#0f172a";
    brush.lineWidth = 3;

    function pos(ev: PointerEvent) {
      const r = canvas.getBoundingClientRect();
      const rw = Math.max(1, r.width);
      const rh = Math.max(1, r.height);
      const x = ((ev.clientX - r.left) / rw) * w;
      const y = ((ev.clientY - r.top) / rh) * h;
      return { x, y };
    }

    function down(ev: PointerEvent) {
      drawing.current = true;
      canvas.setPointerCapture(ev.pointerId);
      const p = pos(ev);
      brush.beginPath();
      brush.moveTo(p.x, p.y);
    }
    function move(ev: PointerEvent) {
      if (!drawing.current) return;
      const p = pos(ev);
      brush.lineTo(p.x, p.y);
      brush.stroke();
    }
    function up(ev: PointerEvent) {
      drawing.current = false;
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
      setSigDataUrl(canvas.toDataURL("image/png"));
    }

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, [mode, numPages]);

  const overlayPx = useMemo(() => {
    return {
      left: box.x * viewerW,
      top: box.y * displayH,
      width: box.w * viewerW,
      height: box.h * displayH,
    };
  }, [box, viewerW, displayH]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      if (d.kind === "move") {
        const dx = (e.clientX - d.sx) / viewerW;
        const dy = (e.clientY - d.sy) / displayH;
        setBox((b) => ({
          ...b,
          x: clamp(d.bx + dx, 0, 1 - b.w),
          y: clamp(d.by + dy, 0, 1 - b.h),
        }));
      } else {
        const dx = (e.clientX - d.sx) / viewerW;
        const dy = (e.clientY - d.sy) / displayH;
        setBox((b) => {
          const nw = clamp(d.bw + dx, 0.08, 1 - b.x);
          const nh = clamp(d.bh + dy, 0.04, 1 - b.y);
          return { ...b, w: nw, h: nh };
        });
      }
    }
    function onUp() {
      drag.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [viewerW, displayH]);

  async function onSubmit() {
    if (!token || !doc || !sigDataUrl) return;
    if (doc.status !== "pending") return;
    setBusy(true);
    setError(null);
    try {
      await submitSignature({
        token,
        imageBase64: dataUrlToBase64(sigDataUrl),
        placement: {
          pageIndex: page - 1,
          nx: box.x,
          ny: box.y,
          nw: box.w,
          nh: box.h,
        },
      });
      const refreshed = await getDocumentByToken(token);
      setDoc(refreshed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <div className="muted">Missing token.</div>;
  }

  if (error && !doc) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900 }}>Could not open signing page</div>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!doc) {
    return <div className="muted">Loading document…</div>;
  }

  if (doc.status === "signed") {
    return (
      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>All set — this document is signed.</div>
        <p className="muted" style={{ margin: 0 }}>
          Download the final PDF below.
        </p>
        {doc.signed_pdf_url ? (
          <a className="btn btn-primary" href={doc.signed_pdf_url} target="_blank" rel="noreferrer">
            Open signed PDF
          </a>
        ) : (
          <div className="muted">Signed file URL is not available.</div>
        )}
      </div>
    );
  }

  if (doc.status === "expired") {
    return (
      <div className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>This signing link has expired.</div>
        <div className="muted">Status: expired</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ padding: "16px 18px", display: "grid", gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.03em" }}>Sign document</h1>
            <div style={{ fontWeight: 800 }}>{doc.title}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Signing as <strong style={{ color: "var(--text)" }}>{doc.signer_name}</strong>
            </div>
          </div>
          <div className="pill pending">pending</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, overflow: "hidden" }}>
        <Document
          file={doc.pdf_url}
          loading={
            <div className="muted" style={{ padding: 24, textAlign: "center" }}>
              Loading PDF…
            </div>
          }
          onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
        >
          {numPages > 0 ? (
            <div className="sign-layout">
              <aside className="sign-col-thumbs" aria-label="Pages">
                {Array.from({ length: numPages }, (_, i) => {
                  const n = i + 1;
                  const active = page === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`sign-thumb${active ? " sign-thumb--active" : ""}`}
                      onClick={() => setPage(n)}
                    >
                      <div className="sign-thumb-frame">
                        <Page
                          pageNumber={n}
                          width={THUMB_W}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                      <span className="sign-thumb-label">Page {n}</span>
                    </button>
                  );
                })}
              </aside>

              <div className="sign-col-viewer sign-viewer-well" ref={viewerWellRef}>
                <div
                  className="sign-viewer-stage"
                  style={{ width: viewerW, height: displayH }}
                >
                  <Page
                    pageNumber={page}
                    width={viewerW}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />

                  {sigDataUrl ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: overlayPx.left,
                          top: overlayPx.top,
                          width: overlayPx.width,
                          height: overlayPx.height,
                          pointerEvents: "auto",
                          border: "1px dashed color-mix(in oklab, var(--accent) 50%, transparent)",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.06)",
                          touchAction: "none",
                        }}
                        onPointerDown={(e) => {
                          const t = e.target as HTMLElement;
                          if (t.dataset.handle === "resize" || t.dataset.handle === "clear") return;
                          e.currentTarget.setPointerCapture(e.pointerId);
                          drag.current = {
                            kind: "move",
                            sx: e.clientX,
                            sy: e.clientY,
                            bx: box.x,
                            by: box.y,
                          };
                        }}
                        onPointerUp={(e) => {
                          try {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                          } catch {
                            // ignore
                          }
                          drag.current = null;
                        }}
                      >
                        <button
                          type="button"
                          className="sig-clear"
                          data-handle="clear"
                          title="Remove signature"
                          aria-label="Remove signature"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setSigDataUrl(null);
                          }}
                        >
                          ×
                        </button>
                        <img
                          alt="Signature preview"
                          src={sigDataUrl}
                          draggable={false}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            userSelect: "none",
                            pointerEvents: "none",
                          }}
                        />
                        <div
                          data-handle="resize"
                          title="Resize"
                          style={{
                            position: "absolute",
                            right: -6,
                            bottom: -6,
                            width: 16,
                            height: 16,
                            borderRadius: 6,
                            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                            border: "2px solid #fff",
                            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
                            pointerEvents: "auto",
                            touchAction: "none",
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            drag.current = {
                              kind: "resize",
                              sx: e.clientX,
                              sy: e.clientY,
                              bw: box.w,
                              bh: box.h,
                            };
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="sign-col-options sign-options-panel">
                <h2>Types</h2>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Create a signature, then drag it on the page. Remove with × or switch type.
                </p>

                <div className="type-pills" role="tablist" aria-label="Signature type">
                  <button
                    type="button"
                    className={`type-pill${mode === "draw" ? " type-pill--active" : ""}`}
                    onClick={() => setMode("draw")}
                  >
                    Draw
                  </button>
                  <button
                    type="button"
                    className={`type-pill${mode === "type" ? " type-pill--active" : ""}`}
                    onClick={() => setMode("type")}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    className={`type-pill${mode === "upload" ? " type-pill--active" : ""}`}
                    onClick={() => setMode("upload")}
                  >
                    Upload image
                  </button>
                </div>

                {mode === "draw" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Draw on the pad. Export updates when you release the pointer.
                    </div>
                    <canvas
                      ref={canvasRef}
                      className="canvas-draw"
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        touchAction: "none",
                      }}
                    />
                    <button type="button" className="btn btn-ghost" onClick={clearDrawCanvas}>
                      Clear drawing pad
                    </button>
                  </div>
                ) : null}

                {mode === "type" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label htmlFor="sigFont">Font style</label>
                      <select
                        id="sigFont"
                        className="input"
                        style={{ padding: "10px 12px" }}
                        value={sigFontId}
                        onChange={(e) => setSigFontId(e.target.value as SignatureFontId)}
                      >
                        {TYPE_SIGNATURE_FONTS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label htmlFor="sigText">Typed signature</label>
                      <input
                        id="sigText"
                        className="input"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                      />
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={renderTypedSignature}>
                      Generate signature image
                    </button>
                    <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                      Transparent background — place over printed text without hiding it.
                    </p>
                  </div>
                ) : null}

                {mode === "upload" ? (
                  <div
                    className={`drop-zone drop-zone--sig${sigDropActive ? " drop-zone--active" : ""}`}
                    onDragEnter={sigDragEnter}
                    onDragLeave={sigDragLeave}
                    onDragOver={sigDragOver}
                    onDrop={sigDrop}
                  >
                    <div className="field" style={{ margin: 0 }}>
                      <span className="field-heading">Signature image</span>
                      <label className="file-input file-input--panel">
                        <span className="file-input__btn">Choose image</span>
                        {uploadLabel ? (
                          <span className="file-input__name" title={uploadLabel}>
                            {uploadLabel}
                          </span>
                        ) : null}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/*"
                          aria-label="Choose signature image"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onPickUpload(f);
                          }}
                        />
                      </label>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                        Drag and drop an image here, or use Choose image. PNG or JPG with transparent
                        background works best.
                      </p>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div
                    style={{
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#991b1b",
                      padding: 10,
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="btn-sign"
                  disabled={!sigDataUrl || busy}
                  onClick={onSubmit}
                >
                  {busy ? "Submitting…" : "Sign document"}
                </button>
              </aside>
            </div>
          ) : null}
        </Document>
      </div>
    </div>
  );
}
