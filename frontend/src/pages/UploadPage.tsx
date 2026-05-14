import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readDroppedPdf } from "../lib/drag-files";
import { uploadPdf, requestSignature } from "../lib/api";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingLink, setSigningLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);

  const pdfDropDepth = useRef(0);
  const [pdfDropActive, setPdfDropActive] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewNumPages, setPreviewNumPages] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewWellRef = useRef<HTMLDivElement | null>(null);
  const [previewW, setPreviewW] = useState(520);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setPreviewPage(1);
      setPreviewNumPages(0);
      setPreviewError(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewPage(1);
    setPreviewNumPages(0);
    setPreviewError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = previewWellRef.current;
    if (!el || !file) return;
    function measure() {
      const box = previewWellRef.current?.getBoundingClientRect();
      if (!box) return;
      const w = box.width;
      setPreviewW(Math.max(280, Math.min(640, Math.floor(w - 24))));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [file]);

  function pdfDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("Files")) return;
    pdfDropDepth.current += 1;
    setPdfDropActive(true);
  }

  function pdfDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    pdfDropDepth.current = Math.max(0, pdfDropDepth.current - 1);
    if (pdfDropDepth.current === 0) setPdfDropActive(false);
  }

  function pdfDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  function pdfDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    pdfDropDepth.current = 0;
    setPdfDropActive(false);
    const f = readDroppedPdf(e.dataTransfer);
    if (f) setFile(f);
  }

  const canSubmit = useMemo(() => {
    return Boolean(file && title.trim() && signerName.trim() && signerEmail.trim());
  }, [file, title, signerName, signerEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setSigningLink(null);
    setEmailSent(null);
    try {
      const up = await uploadPdf(file);
      const req = await requestSignature({
        fileKey: up.fileKey,
        title: title.trim(),
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim(),
      });
      const url = `${window.location.origin}${req.signingPath}`;
      setSigningLink(url);
      setEmailSent(req.emailSent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 34, letterSpacing: "-0.03em" }}>
          Send a signature request
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
          Jasign streamlines PDF signing by allowing requesters to upload documents, send secure signing links, and receive completed signed files. Signing links may be shared manually or delivered automatically through email notifications.
        </p>
      </div>

      <form className="card" onSubmit={onSubmit} style={{ padding: 18, display: "grid", gap: 14 }}>
        <div
          className={`drop-zone${pdfDropActive ? " drop-zone--active" : ""}`}
          onDragEnter={pdfDragEnter}
          onDragLeave={pdfDragLeave}
          onDragOver={pdfDragOver}
          onDrop={pdfDrop}
        >
          <div className="field">
            <span className="field-heading">PDF document</span>
            <label className="file-input">
              <span className="file-input__btn">Choose file</span>
              {file ? <span className="file-input__name">{file.name}</span> : null}
              <input
                id="pdf"
                type="file"
                accept="application/pdf"
                aria-label="Choose PDF file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Drag and drop a PDF here, or use Choose file.
            </p>
          </div>
        </div>

        {file && previewUrl ? (
          <div
            ref={previewWellRef}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 14,
              background: "color-mix(in oklab, var(--surface) 92%, var(--bg))",
              display: "grid",
              gap: 12,
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="field-heading" style={{ margin: 0 }}>
                Preview
              </span>
              {previewNumPages > 1 ? (
                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Page {previewPage} of {previewNumPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    disabled={previewPage >= previewNumPages}
                    onClick={() => setPreviewPage((p) => Math.min(previewNumPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
            {previewError ? (
              <div style={{ color: "var(--danger)", fontSize: 14 }}>{previewError}</div>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", overflow: "auto" }}>
                <Document
                  key={previewUrl}
                  file={previewUrl}
                  loading={
                    <div className="muted" style={{ padding: 24, textAlign: "center" }}>
                      Loading preview…
                    </div>
                  }
                  onLoadSuccess={(pdf) => {
                    setPreviewNumPages(pdf.numPages);
                    setPreviewError(null);
                  }}
                  onLoadError={() => {
                    setPreviewError("Could not read this PDF for preview. You can still try sending it.");
                    setPreviewNumPages(0);
                  }}
                >
                  {previewNumPages > 0 ? (
                    <Page
                      pageNumber={previewPage}
                      width={previewW}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ) : null}
                </Document>
              </div>
            )}
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="title">Document title</label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Internship offer letter"
            autoComplete="off"
          />
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <div className="field">
            <label htmlFor="signerName">Signer name</label>
            <input
              id="signerName"
              className="input"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor="signerEmail">Signer email</label>
            <input
              id="signerEmail"
              className="input"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
            />
          </div>
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

        <div className="row" style={{ justifyContent: "flex-start" }}>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit || busy}>
            {busy ? "Working…" : "Send signature request"}
          </button>
        </div>
      </form>

      {signingLink ? (
        <div className="card" style={{ padding: 18, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Request created</div>
          {emailSent ? (
            <div
              style={{
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                padding: 12,
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              We sent an email to <strong>{signerEmail}</strong> with a link to sign. Ask them to check
              spam if it does not arrive within a few minutes.
            </div>
          ) : emailSent === false ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#475569",
                padding: 12,
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              We could not send the email automatically this time. You can still copy the signing link
              below and share it however you usually reach your signer.
            </div>
          ) : null}
          <div className="muted" style={{ fontSize: 13 }}>
            Copy and send this URL to <strong style={{ color: "var(--text)" }}>{signerEmail}</strong> if
            they need it again.
          </div>
          <div className="row" style={{ gap: 10 }}>
            <input className="input" readOnly value={signingLink} />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(signingLink);
              }}
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
