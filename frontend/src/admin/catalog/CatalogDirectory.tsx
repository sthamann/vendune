/** Product columns and native catalog criteria over the shared grid; media/price/content stay domain-owned. */
import type { GridQueryState } from "../../shared/grid/types";
import AgenticGrid from "../../shared/grid/AgenticGrid";
import { useGridPage } from "../../shared/grid/useGridPage";
import { useGridAccess } from "../../shared/grid/useGridAccess";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import { inheritedText } from "../../shared/geography/geography-types";
import Icon from "../../shared/ui/Icon";
import type { Category } from "./catalog-model";
import type { RequestFn } from "../shell/studio-types";
export default function CatalogDirectory({
  request,
  queryState,
  categories,
  mainLocale,
  onOpen,
  onNew,
  canWrite,
}: {
  request: RequestFn;
  queryState?: GridQueryState;
  categories: Category[];
  mainLocale: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  canWrite: boolean;
}) {
  const { c, money, locale } = useCatalogText();
  const page = useGridPage(request, "/api/merchant/products", {}, queryState);
  const rights = useGridAccess(request);
  const categoryName = (cat: Category) =>
    inheritedText(cat.data.translations, locale, mainLocale, "name");
  return (
    <AgenticGrid
      id="products"
      title={c("products")}
      {...page}
      searchKey="search"
      onRow={(row) => onOpen(row.id)}
      rowKey={(p) => p.id}
      agent={{
        entity: "products",
        request,
        enabled:
          rights.includes("assistant.use") && rights.includes("catalog.read"),
      }}
      emptyAction={
        canWrite && (
          <button type="button" className="studio-primary" onClick={onNew}>
            {c("newProduct")}
          </button>
        )
      }
      filters={[
        {
          key: "active",
          label: c("status"),
          options: [
            { value: "true", label: c("active") },
            { value: "false", label: c("inactive") },
          ],
        },
        {
          key: "categoryId",
          label: c("categories"),
          options: categories.map((cat) => ({
            value: cat.id,
            label: categoryName(cat),
          })),
        },
        {
          key: "lowStock",
          label: c("stock"),
          options: [{ value: "true", label: c("lowStock") }],
        },
      ]}
      columns={[
        {
          id: "name",
          label: c("name"),
          sort: "name",
          render: (p) => (
            <button
              type="button"
              className="agent-grid-link"
              onClick={() => onOpen(p.id)}
            >
              {p.media?.[0]?.url ? (
                <img src={p.media[0].url} alt="" />
              ) : (
                <span className="agent-grid-avatar">
                  <Icon name="box" />
                </span>
              )}
              <span>
                <strong>{p.name}</strong>
                <small>
                  {(p.categoryIds ?? [])
                    .map((id: string) =>
                      categories.find((cat) => cat.id === id),
                    )
                    .filter(Boolean)
                    .map(categoryName)
                    .join(" · ") || "—"}
                </small>
              </span>
            </button>
          ),
        },
        {
          id: "number",
          label: c("number"),
          sort: "number",
          render: (p) => p.productNumber,
        },
        {
          id: "active",
          label: c("status"),
          render: (p) => (
            <span className="agent-grid-tag">
              {c(p.active ? "active" : "inactive")}
            </span>
          ),
        },
        {
          id: "price",
          label: c("price"),
          sort: "price",
          align: "end",
          render: (p) => money(p.price),
        },
        {
          id: "stock",
          label: c("stock"),
          sort: "stock",
          align: "end",
          render: (p) => (
            <span className={p.stock <= 5 ? "catalog-low" : ""}>{p.stock}</span>
          ),
        },
        {
          id: "variants",
          label: c("variants"),
          align: "end",
          render: (p) => p.variantCount,
        },
      ]}
    />
  );
}
