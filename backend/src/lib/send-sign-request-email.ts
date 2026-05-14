const RESEND_API = "https://api.resend.com/emails";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function subjectForSignRequest(title: string): string {
  const t = title.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  return `Signature requested: ${t || "Document"}`;
}

export type SendSignRequestEmailInput = {
  apiKey: string;
  from: string;
  to: string;
  signerName: string;
  title: string;
  signingUrl: string;
  requesterLabel: string;
};

export async function sendSignRequestEmail(
  input: SendSignRequestEmailInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { apiKey, from, to, signerName, title, signingUrl, requesterLabel } = input;

  const safeName = escapeHtml(signerName);
  const safeTitle = escapeHtml(title);
  const safeReq = escapeHtml(requesterLabel);
  const safeUrl = escapeHtml(signingUrl);

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.55;color:#0f172a;max-width:560px">
<p>Hi ${safeName},</p>
<p><strong>${safeReq}</strong> asked you to sign <strong>${safeTitle}</strong>.</p>
<p><a href="${safeUrl}" style="display:inline-block;padding:10px 18px;background:#111827;color:#f8fafc;text-decoration:none;border-radius:10px;font-weight:600">Review and sign</a></p>
<p style="font-size:13px;color:#64748b">If the button does not work, open this link in your browser:<br><a href="${safeUrl}" style="color:#2563eb;word-break:break-all">${safeUrl}</a></p>
</body></html>`;

  const text = `Hi ${signerName},\n\n${requesterLabel} asked you to sign: ${title}.\n\nOpen and sign:\n${signingUrl}\n`;

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: subjectForSignRequest(title),
        html,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, message: `${res.status} ${body.slice(0, 500)}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `fetch failed: ${msg}` };
  }
}
