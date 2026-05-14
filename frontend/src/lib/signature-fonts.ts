export type SignatureFontId = "classic" | "script" | "dancing" | "caveat" | "modern";

export const TYPE_SIGNATURE_FONTS: {
  id: SignatureFontId;
  label: string;
  /** Canvas 2D `font` string (size in px for consistent export) */
  canvasFont: string;
}[] = [
  {
    id: "classic",
    label: "Classic serif",
    canvasFont: `700 62px ui-serif, Georgia, "Times New Roman", serif`,
  },
  {
    id: "script",
    label: "Cursive (system)",
    canvasFont: `600 72px "Segoe Script", "Brush Script MT", "Apple Chancery", cursive`,
  },
  {
    id: "dancing",
    label: "Dancing Script",
    canvasFont: `600 72px "Dancing Script", cursive`,
  },
  {
    id: "caveat",
    label: "Caveat",
    canvasFont: `600 76px "Caveat", cursive`,
  },
  {
    id: "modern",
    label: "Modern sans",
    canvasFont: `600 60px system-ui, -apple-system, "Segoe UI", sans-serif`,
  },
];

export function getTypeSignatureFont(id: SignatureFontId): string {
  return TYPE_SIGNATURE_FONTS.find((f) => f.id === id)?.canvasFont ?? TYPE_SIGNATURE_FONTS[0]!.canvasFont;
}
