/** Central catalog workspace uses shared server-paged grids, existing product editing and hierarchical categories. */
import type { GridCriteria } from "../../shared/grid/types";
import { lazy, useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { OpenEntity } from "../shell/useEntityNavigation";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import type { Category } from "./catalog-model";
const ProductEditor = lazy(() => import("./ProductEditor"));
import CatalogDirectory from "./CatalogDirectory";
import CategoriesWorkspace from "./CategoriesWorkspace";
import "../styles/catalog.css";
import "../styles/catalog-editor.css";
export default function ProductDataView({
  request,
  initialId,
  onEntityBack,
  onEntity,
  canWrite = true,
}: {
  request: RequestFn;
  canWrite?: boolean;
  initialId?: string;
  onEntityBack?: () => void;
  onEntity?: OpenEntity;
}) {
  const [gridCursor, setGridCursor] = useState("");
  const [gridCriteria, setGridCriteria] = useState<GridCriteria>({});
  const { c } = useCatalogText();
  const [mainLocale, setMainLocale] = useState("en-GB");
  const [view, setView] = useState("products"),
    [id, setId] = useState<string | null>(null),
    [categories, setCategories] = useState<Category[]>([]),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => setId(initialId ?? null), [initialId]);
  useEffect(() => {
    let current = true;
    request("/api/merchant/categories")
      .then((v) => {
        if (current) {
          setCategories(v.elements);
          setMainLocale(v.mainLocale ?? "en-GB");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [request, reload]);
  if (id !== null)
    return (
      <ProductEditor
        key={id}
        id={id}
        request={request}
        categories={categories}
        canWrite={canWrite}
        onBack={() => {
          setReload((v) => v + 1);
          if (onEntityBack) onEntityBack();
          else setId(null);
        }}
        onCreated={(id) => (onEntity ? onEntity("productData", id) : setId(id))}
      />
    );
  return (
    <div className="studio-page catalog-workspace">
      <div className="catalog-heading">
        <div>
          <p className="catalog-eyebrow">{c("products")}</p>
          <h1>{c("products")}</h1>
          <p>{c("intro")}</p>
        </div>
        {view === "products" && canWrite && (
          <button
            type="button"
            className="studio-primary"
            onClick={() => setId("")}
          >
            + {c("newProduct")}
          </button>
        )}
      </div>
      <div className="catalog-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={view === "products"}
          onClick={() => setView("products")}
        >
          {c("products")}
        </button>
        <button
          role="tab"
          aria-selected={view === "categories"}
          onClick={() => setView("categories")}
        >
          {c("categories")}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {view === "categories" ? (
        <CategoriesWorkspace
          request={request}
          categories={categories}
          canWrite={canWrite}
          onRefresh={() => setReload((v) => v + 1)}
        />
      ) : (
        <CatalogDirectory
          queryState={{
            criteria: gridCriteria,
            onCriteria: setGridCriteria,
            cursor: gridCursor,
            onCursor: setGridCursor,
          }}
          request={request}
          categories={categories}
          mainLocale={mainLocale}
          canWrite={canWrite}
          onNew={() => setId("")}
          onOpen={(id) => (onEntity ? onEntity("productData", id) : setId(id))}
        />
      )}
    </div>
  );
}
