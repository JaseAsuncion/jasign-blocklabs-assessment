import { randomBytes, randomUUID } from "node:crypto";
import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { PDFDocument } from "pdf-lib";
import { readEnv } from "./env";
import { createServerClient } from "./lib/supabase";
import { requireBearerUser } from "./lib/auth";
import { embedSignaturePng } from "./lib/pdf-signature";
import { sendSignRequestEmail } from "./lib/send-sign-request-email";

const env = readEnv();
const supabase = createServerClient(env);

async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

async function loadPageSizes(
  pdfBytes: Uint8Array,
): Promise<{ width: number; height: number }[]> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPages().map((p) => {
    const { width, height } = p.getSize();
    return { width, height };
  });
}

function publicObjectUrl(bucket: string, path: string): string {
  return `${env.PUBLIC_STORAGE_BASE}/${bucket}/${path}`;
}

function decodeBase64Png(dataUrlOrBase64: string): Uint8Array {
  const raw = dataUrlOrBase64.includes(",")
    ? dataUrlOrBase64.split(",", 2)[1]!
    : dataUrlOrBase64;
  const bin = Buffer.from(raw, "base64");
  return new Uint8Array(bin);
}

const app = new Elysia()
  .onError(({ error, code, set }) => {
    set.headers["content-type"] = "application/json; charset=utf-8";
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Internal Server Error";

    if (code === "VALIDATION" || code === "PARSE") {
      set.status = 422;
      return { error: message };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: message };
    }

    console.error("[jasign-api]", code, error);
    set.status =
      typeof set.status === "number" && set.status >= 400 && set.status < 600
        ? set.status
        : 500;
    return { error: message };
  })
  .use(
    cors({
      origin:
        env.CORS_ORIGINS.length === 1 ? env.CORS_ORIGINS[0]! : env.CORS_ORIGINS,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .get("/", () => ({ ok: true, service: "jasign-api" }))
  .get("/health", () => ({ ok: true }))
  .post(
    "/upload",
    async ({ request, body, set }) => {
      const auth = await requireBearerUser(request, env);
      if ("error" in auth) {
        set.status = auth.status;
        return { error: auth.error };
      }

      const file = body.file;
      const ab = await file.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const header = String.fromCharCode(...bytes.slice(0, 4));
      if (header !== "%PDF") {
        set.status = 400;
        return { error: "File must be a PDF" };
      }

      const id = randomUUID();
      const storagePath = `${id}.pdf`;
      const { error } = await supabase.storage.from("documents").upload(storagePath, Buffer.from(ab), {
        contentType: "application/pdf",
        upsert: true,
      });

      if (error) {
        set.status = 500;
        return { error: error.message };
      }

      const pdfUrl = publicObjectUrl("documents", storagePath);
      return { fileKey: storagePath, pdfUrl };
    },
    { body: t.Object({ file: t.File() }) },
  )
  .post(
    "/request-signature",
    async ({ request, body, set }) => {
      const auth = await requireBearerUser(request, env);
      if ("error" in auth) {
        set.status = auth.status;
        return { error: auth.error };
      }

      const pdfUrl = publicObjectUrl("documents", body.fileKey);
      const token = randomBytes(24).toString("hex");

      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: body.title.trim(),
          pdf_url: pdfUrl,
          signer_name: body.signer_name.trim(),
          signer_email: body.signer_email.trim(),
          token,
          status: "pending",
          requester_id: auth.user.id,
        })
        .select("id")
        .single();

      if (error || !data) {
        set.status = 500;
        return { error: error?.message ?? "Insert failed" };
      }

      const appBase = (
        env.PUBLIC_APP_URL || env.CORS_ORIGINS[0] || "http://localhost:5173"
      ).replace(/\/$/, "");
      const signingUrl = `${appBase}/sign/${token}`;

      let emailSent = false;
      let emailError: string | undefined;

      if (!env.RESEND_API_KEY) {
        emailError =
          "RESEND_API_KEY is empty or missing on the server (check Render environment variables).";
      } else {
        const from =
          env.EMAIL_FROM.trim() || "Jasign <onboarding@resend.dev>";
        const mail = await sendSignRequestEmail({
          apiKey: env.RESEND_API_KEY,
          from,
          to: body.signer_email.trim(),
          signerName: body.signer_name.trim(),
          title: body.title.trim(),
          signingUrl,
          requesterLabel: auth.user.email ?? "A Jasign user",
        });
        emailSent = mail.ok;
        if (!mail.ok) {
          emailError = mail.message;
          console.error("[jasign-api] sign-request email failed:", mail.message);
        }
      }

      return {
        id: data.id,
        token,
        signingPath: `/sign/${token}`,
        emailSent,
        ...(emailError ? { emailError } : {}),
      };
    },
    {
      body: t.Object({
        fileKey: t.String({ minLength: 1 }),
        title: t.String({ minLength: 1 }),
        signer_name: t.String({ minLength: 1 }),
        signer_email: t.String({ minLength: 3 }),
      }),
    },
  )
  .get(
    "/document/:token",
    async ({ params, set }) => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id,title,pdf_url,signer_name,signer_email,status,signed_pdf_url,created_at",
        )
        .eq("token", params.token)
        .maybeSingle();

      if (error) {
        set.status = 500;
        return { error: error.message };
      }
      if (!data) {
        set.status = 404;
        return { error: "Not found" };
      }

      let pages: { width: number; height: number }[] = [];
      try {
        const pdfBytes = await fetchPdfBytes(data.pdf_url);
        pages = await loadPageSizes(pdfBytes);
      } catch {
        pages = [];
      }

      return { ...data, pages };
    },
    { params: t.Object({ token: t.String() }) },
  )
  .post(
    "/submit-signature",
    async ({ body, set }) => {
      const { data: row, error: qerr } = await supabase
        .from("documents")
        .select("id,pdf_url,status")
        .eq("token", body.token)
        .maybeSingle();

      if (qerr) {
        set.status = 500;
        return { error: qerr.message };
      }
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      if (row.status !== "pending") {
        set.status = 409;
        return { error: "Document is not pending signature" };
      }

      const { pageIndex, nx, ny, nw, nh } = body.placement;
      if (
        pageIndex < 0 ||
        nw <= 0 ||
        nh <= 0 ||
        nx < 0 ||
        ny < 0 ||
        nx + nw > 1.02 ||
        ny + nh > 1.02
      ) {
        set.status = 400;
        return { error: "Invalid placement" };
      }

      let pngBytes: Uint8Array;
      try {
        pngBytes = decodeBase64Png(body.imageBase64);
      } catch {
        set.status = 400;
        return { error: "Invalid image data" };
      }

      let signedBytes: Uint8Array;
      try {
        const pdfBytes = await fetchPdfBytes(row.pdf_url);
        signedBytes = await embedSignaturePng(pdfBytes, pngBytes, {
          pageIndex,
          nx,
          ny,
          nw,
          nh,
        });
      } catch (e) {
        set.status = 500;
        return {
          error: e instanceof Error ? e.message : "Failed to sign document",
        };
      }

      const outPath = `${row.id}.pdf`;
      const { error: uerr } = await supabase.storage.from("signed").upload(outPath, Buffer.from(signedBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

      if (uerr) {
        set.status = 500;
        return { error: uerr.message };
      }

      const signedPdfUrl = publicObjectUrl("signed", outPath);
      const { error: updErr } = await supabase
        .from("documents")
        .update({ status: "signed", signed_pdf_url: signedPdfUrl })
        .eq("id", row.id);

      if (updErr) {
        set.status = 500;
        return { error: updErr.message };
      }

      return { ok: true, signed_pdf_url: signedPdfUrl };
    },
    {
      body: t.Object({
        token: t.String({ minLength: 1 }),
        imageBase64: t.String({ minLength: 1 }),
        placement: t.Object({
          pageIndex: t.Number(),
          nx: t.Number(),
          ny: t.Number(),
          nw: t.Number(),
          nh: t.Number(),
        }),
      }),
    },
  )
  .get("/documents", async ({ request, set }) => {
    const auth = await requireBearerUser(request, env);
    if ("error" in auth) {
      set.status = auth.status;
      return { error: auth.error };
    }

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id,title,status,pdf_url,signed_pdf_url,signer_name,signer_email,created_at,token",
      )
      .eq("requester_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      set.status = 500;
      return { error: error.message };
    }

    return { documents: data ?? [] };
  });

app.listen(env.PORT);
console.log(`Jasign API listening on http://localhost:${env.PORT}`);
