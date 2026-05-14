/** First matching file from a drop (some browsers omit `type` for PDFs). */
export function readDroppedPdf(dataTransfer: DataTransfer): File | null {
  const { files } = dataTransfer;
  if (!files?.length) return null;
  for (let i = 0; i < files.length; i++) {
    const f = files.item(i);
    if (!f) continue;
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) return f;
  }
  return null;
}

export function readDroppedImage(dataTransfer: DataTransfer): File | null {
  const { files } = dataTransfer;
  if (!files?.length) return null;
  for (let i = 0; i < files.length; i++) {
    const f = files.item(i);
    if (!f) continue;
    if (f.type.startsWith("image/")) return f;
  }
  return null;
}
