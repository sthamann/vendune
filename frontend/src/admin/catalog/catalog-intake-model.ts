/** Review state carries stable native IDs; source changes discard the entire prior proposal, never overwrite existing products. */
export type IntakeMode = "csv" | "url" | "demo";
export type IntakeDraft = {
  name: string;
  description: string;
  price: number;
  productNumber?: string;
  imageUrl?: string;
};
export type IntakeRow = {
  id: string;
  draft: IntakeDraft;
  selected: boolean;
  saved?: boolean;
  imageQueued?: boolean;
  error?: string;
};
export type IntakePreview = {
  drafts: IntakeDraft[];
  settingsRevision: number;
  mainLocale: string;
  currency: string;
  demo: boolean;
};
export const csvTemplate =
  'name,price,description,productNumber,imageUrl\n"Sample product",19.90,"Replace this description",SKU-001,\n';
export async function readCatalogFile(file: File) {
  if (!/\.csv$/i.test(file.name) || file.size > 200000 || file.size === 0)
    throw new Error("fileInvalid");
  const data = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new Error("fileInvalid");
  }
}
