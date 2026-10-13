/** Product mutation actions share the workspace write grant; read-only users can still inspect all product tabs. */
import type { ProductDraft } from "./catalog-model";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
export default function ProductEditorActions({
  draft,
  id,
  canWrite,
  busy,
  editorPending,
  dirty,
  change,
  save,
}: {
  draft: ProductDraft;
  id: string;
  canWrite: boolean;
  busy: boolean;
  editorPending: boolean;
  dirty: boolean;
  change: (d: ProductDraft) => void;
  save: () => void;
}) {
  const { c } = useCatalogText();
  return (
    <div className="catalog-editor-actions">
      <label className="checkbox-label">
        <input
          type="checkbox"
          disabled={!canWrite}
          checked={draft.catalog.active}
          onChange={(e) =>
            change({
              ...draft,
              catalog: { ...draft.catalog, active: e.target.checked },
            })
          }
        />
        {c("active")}
      </label>
      <button
        className="studio-primary"
        disabled={
          !canWrite ||
          busy ||
          editorPending ||
          (!dirty && !!id) ||
          !draft.catalog.productNumber ||
          !Object.values(draft.translations).some((t) => t.name?.trim())
        }
        onClick={save}
      >
        {c(busy ? "saving" : "save")}
      </button>
    </div>
  );
}
