/** Editable catalogue review is distinct from native creation and later publication; AI images reuse the product editor's job workflow. */
import type { IntakePreview, IntakeRow } from "./catalog-intake-model";
import { useCatalogIntakeText } from "../../shared/i18n/catalog-intake-i18n";
export default function CatalogIntakeReview({
  preview,
  rows,
  setRows,
  tax,
  setTax,
  images,
  setImages,
  imageConfigured,
  busy,
  onSave,
  onOpen,
}: {
  preview: IntakePreview;
  rows: IntakeRow[];
  setRows: (rows: IntakeRow[]) => void;
  tax: string;
  setTax: (tax: string) => void;
  images: boolean;
  setImages: (value: boolean) => void;
  imageConfigured: boolean;
  busy: boolean;
  onSave: () => void;
  onOpen: (id: string) => void;
}) {
  const c = useCatalogIntakeText();
  const patch = (id: string, update: Partial<IntakeRow>) =>
    setRows(rows.map((row) => (row.id === id ? { ...row, ...update } : row)));
  const update = (
    row: IntakeRow,
    key: "name" | "description" | "price" | "productNumber" | "imageUrl",
    value: string,
  ) =>
    patch(row.id, {
      draft: { ...row.draft, [key]: key === "price" ? Number(value) : value },
    });
  const pending = rows.filter((row) => row.selected && !row.saved);
  return (
    <section className="catalog-intake-review">
      <h3>{c("review")}</h3>
      <p>{c("reviewHint")}</p>
      <p>
        <strong>
          {preview.mainLocale} · {preview.currency}
        </strong>
      </p>
      <label>
        {c("tax")}
        <input
          type="number"
          min="0"
          max="50"
          step="0.01"
          required
          value={tax}
          disabled={busy || rows.some((r) => r.saved)}
          onChange={(e) => setTax(e.target.value)}
        />
      </label>
      {preview.demo && (
        <div className="catalog-intake-images">
          <label>
            <input
              type="checkbox"
              checked={images}
              disabled={!imageConfigured || busy || rows.some((r) => r.saved)}
              onChange={(e) => setImages(e.target.checked)}
            />
            {c("images")}
          </label>
          <p>{c(imageConfigured ? "imageHint" : "imageUnavailable")}</p>
        </div>
      )}
      <div className="catalog-intake-products">
        {rows.map((row, index) => (
          <article key={row.id}>
            <label className="catalog-intake-select">
              <input
                type="checkbox"
                aria-label={`${c("select")} ${index + 1}`}
                checked={row.selected}
                disabled={busy || row.saved}
                onChange={(e) => patch(row.id, { selected: e.target.checked })}
              />
              <strong>{index + 1}</strong>
            </label>
            <div>
              <label>
                {c("name")}
                <input
                  value={row.draft.name}
                  maxLength={200}
                  disabled={busy || row.saved}
                  onChange={(e) => update(row, "name", e.target.value)}
                />
              </label>
              <label>
                {c("description")}
                <textarea
                  rows={2}
                  value={row.draft.description}
                  maxLength={4000}
                  disabled={busy || row.saved}
                  onChange={(e) => update(row, "description", e.target.value)}
                />
              </label>
              <label>
                {c("price")} · {preview.currency}
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="any"
                  value={row.draft.price}
                  disabled={busy || row.saved}
                  onChange={(e) => update(row, "price", e.target.value)}
                />
              </label>
              <details>
                <summary>{c("sourceFields")}</summary>
                <label>
                  {c("productNumber")}
                  <input
                    value={row.draft.productNumber ?? ""}
                    maxLength={100}
                    disabled={busy || row.saved}
                    onChange={(e) =>
                      update(row, "productNumber", e.target.value)
                    }
                  />
                </label>
                <label>
                  {c("imageUrl")}
                  <input
                    type="url"
                    value={row.draft.imageUrl ?? ""}
                    maxLength={2000}
                    disabled={busy || row.saved}
                    onChange={(e) => update(row, "imageUrl", e.target.value)}
                  />
                </label>
              </details>
              {row.saved && (
                <p role="status">
                  {c("saved")}
                  {row.imageQueued && <> · {c("imageQueued")}</>}
                </p>
              )}
              {row.error && <p role="alert">{row.error}</p>}
              {row.saved && (
                <button
                  type="button"
                  className="studio-secondary"
                  disabled={busy}
                  onClick={() => onOpen(row.id)}
                >
                  {c("open")}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        className="studio-primary"
        disabled={
          busy ||
          !pending.length ||
          tax.trim() === "" ||
          !Number.isFinite(Number(tax)) ||
          Number(tax) < 0 ||
          Number(tax) > 50 ||
          pending.some(
            (r) =>
              !r.draft.name.trim() ||
              !Number.isFinite(r.draft.price) ||
              r.draft.price < 0 ||
              r.draft.price > 1000000,
          )
        }
        onClick={onSave}
      >
        {c(busy ? "saving" : "save")}
        {!busy && ` · ${pending.length}`}
      </button>
    </section>
  );
}
