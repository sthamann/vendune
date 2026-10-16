/** Bounded local screenshot preparation; only reduced raster data reaches the existing vision API. */
export async function prepareDesignImage(file: File): Promise<string> {
  if (
    !/^(image\/png|image\/jpeg|image\/webp)$/.test(file.type) ||
    !file.size ||
    file.size > 12 * 1024 * 1024
  )
    throw new Error("image");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width > 8192 ||
      bitmap.height > 8192 ||
      bitmap.width * bitmap.height > 16_000_000
    )
      throw new Error("image");
    const ratio = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.55]) {
      const value = canvas.toDataURL("image/webp", quality);
      if (
        value.startsWith("data:image/webp;base64,") &&
        value.length < 1_350_000
      )
        return value;
    }
    throw new Error("image");
  } finally {
    bitmap.close();
  }
}
export function designUrls(value: string): string[] {
  const urls = value
    .split(/\n/)
    .map((u) => u.trim())
    .filter(Boolean);
  if (
    urls.length > 3 ||
    urls.some((u) => {
      try {
        const parsed = new URL(u);
        return (
          parsed.protocol !== "https:" ||
          !!parsed.username ||
          !!parsed.password ||
          u.length > 2000
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error("urls");
  return urls;
}
