import { PDFDocument } from "pdf-lib";

export type NormalizedPlacement = {
  pageIndex: number;
  /** 0–1 from left */
  nx: number;
  /** 0–1 from top (CSS-style) */
  ny: number;
  nw: number;
  nh: number;
};

/**
 * Converts normalized top-left box to pdf-lib drawImage rect (origin bottom-left).
 */
export function normalizedToPdfDrawRect(
  pageWidth: number,
  pageHeight: number,
  p: Pick<NormalizedPlacement, "nx" | "ny" | "nw" | "nh">,
): { x: number; y: number; width: number; height: number } {
  const width = p.nw * pageWidth;
  const height = p.nh * pageHeight;
  const x = p.nx * pageWidth;
  const y = pageHeight - p.ny * pageHeight - height;
  return { x, y, width, height };
}

export async function embedSignaturePng(
  pdfBytes: Uint8Array,
  pngBytes: Uint8Array,
  placement: NormalizedPlacement,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  const page = pages[placement.pageIndex];
  if (!page) throw new Error("Invalid pageIndex");

  const { width: pw, height: ph } = page.getSize();
  const rect = normalizedToPdfDrawRect(pw, ph, placement);
  const png = await doc.embedPng(pngBytes);
  page.drawImage(png, rect);
  return new Uint8Array(await doc.save());
}
