import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendSignRequestEmail } from "../src/lib/send-sign-request-email";

describe("sendSignRequestEmail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to Resend and returns ok on 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const r = await sendSignRequestEmail({
      apiKey: "re_test",
      from: "Jasign <onboarding@resend.dev>",
      to: "signer@example.com",
      signerName: "Sam Signer",
      title: "Offer letter",
      signingUrl: "http://localhost:5173/sign/abc123",
      requesterLabel: "req@example.com",
    });

    expect(r).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
    };
    expect(body.from).toContain("Jasign");
    expect(body.to).toEqual(["signer@example.com"]);
    expect(body.subject).toBe("Signature requested: Offer letter");
    expect(body.html).toContain("Sam Signer");
    expect(body.text).toContain("http://localhost:5173/sign/abc123");
  });

  it("returns ok false when Resend responds with error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "bad" }), { status: 422 }),
    );

    const r = await sendSignRequestEmail({
      apiKey: "re_bad",
      from: "Jasign <onboarding@resend.dev>",
      to: "x@y.z",
      signerName: "A",
      title: "B",
      signingUrl: "https://app.example/sign/t",
      requesterLabel: "C",
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("422");
  });
});
