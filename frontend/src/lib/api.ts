import { supabase } from "./supabase-browser";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3001")
  .trim()
  .replace(/\/+$/, "");

function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function parseJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.length > 600 ? `${text.slice(0, 600)}…` : text);
  }
}

export async function uploadPdf(file: File): Promise<{ fileKey: string; pdfUrl: string }> {
  const ah = await authHeaders();
  if (!("Authorization" in ah)) {
    throw new Error("You must be signed in to upload a PDF.");
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(apiUrl("/upload"), { method: "POST", headers: ah, body: fd });
  const json = await parseJsonBody<{ error?: string; fileKey?: string; pdfUrl?: string }>(res);
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  if (!json.fileKey || !json.pdfUrl) throw new Error("Invalid upload response");
  return { fileKey: json.fileKey, pdfUrl: json.pdfUrl };
}

export async function requestSignature(payload: {
  fileKey: string;
  title: string;
  signer_name: string;
  signer_email: string;
}): Promise<{ id: string; token: string; signingPath: string; emailSent: boolean }> {
  const ah = await authHeaders();
  if (!("Authorization" in ah)) {
    throw new Error("You must be signed in to create a signature request.");
  }
  const res = await fetch(apiUrl("/request-signature"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ah },
    body: JSON.stringify(payload),
  });
  const json = await parseJsonBody<{
    error?: string;
    id?: string;
    token?: string;
    signingPath?: string;
    emailSent?: boolean;
  }>(res);
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  if (!json.id || !json.token || !json.signingPath) throw new Error("Invalid response");
  return {
    id: json.id,
    token: json.token,
    signingPath: json.signingPath,
    emailSent: Boolean(json.emailSent),
  };
}

export type DocumentPayload = {
  id: string;
  title: string;
  pdf_url: string;
  signer_name: string;
  signer_email: string;
  status: "pending" | "signed" | "expired";
  signed_pdf_url: string | null;
  created_at: string;
  pages: { width: number; height: number }[];
};

export async function getDocumentByToken(token: string): Promise<DocumentPayload> {
  const res = await fetch(apiUrl(`/document/${encodeURIComponent(token)}`));
  const json = await parseJsonBody<{ error?: string } & Partial<DocumentPayload>>(res);
  if (!res.ok) throw new Error(json.error ?? "Failed to load document");
  if (!json.id || !json.pdf_url) throw new Error("Invalid document payload");
  return json as DocumentPayload;
}

export async function submitSignature(payload: {
  token: string;
  imageBase64: string;
  placement: { pageIndex: number; nx: number; ny: number; nw: number; nh: number };
}): Promise<{ signed_pdf_url: string }> {
  const res = await fetch(apiUrl("/submit-signature"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await parseJsonBody<{ error?: string; signed_pdf_url?: string }>(res);
  if (!res.ok) throw new Error(json.error ?? "Submit failed");
  if (!json.signed_pdf_url) throw new Error("Invalid submit response");
  return { signed_pdf_url: json.signed_pdf_url };
}

export type DashboardDocument = {
  id: string;
  title: string;
  status: "pending" | "signed" | "expired";
  pdf_url: string;
  signed_pdf_url: string | null;
  signer_name: string;
  signer_email: string;
  created_at: string;
  token: string;
};

export async function listDocuments(): Promise<DashboardDocument[]> {
  const ah = await authHeaders();
  if (!("Authorization" in ah)) {
    throw new Error("You must be signed in to view your documents.");
  }
  const res = await fetch(apiUrl("/documents"), { headers: ah });
  const json = await parseJsonBody<{ error?: string; documents?: DashboardDocument[] }>(res);
  if (!res.ok) throw new Error(json.error ?? "Failed to list documents");
  return json.documents ?? [];
}
