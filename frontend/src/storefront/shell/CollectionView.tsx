/** CollectionView: storefront view composed from the scoped cart/controller. */
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import { BRAND } from "../../shared/ui/Brand";
import ProductTile from "./ProductTile";
import CatalogNavigation from "./CatalogNavigation";
import "../../shared/styles/apps.css";
import "../../shared/styles/workbench.css";
import "../styles/shop.css";

import { useStorefront } from "./StorefrontContext";
export default function CollectionView() {
  const b = useBuildingText();
  const {
    s,
    adapted,
    experience,
    query,
    setQuery,
    catalogLoading,
    list,
    setViewed,
    money,
    cart,
    pageCursor,
    busy,
    run,
    catalog,
    nextCursor,
  } = useStorefront();
  return (
    <section className="shop-collection" id="collection">
      <div className="collection-title">
        <div>
          <p className="shop-kicker">
            {BRAND.name} / {s("collection")}
          </p>
          <h2>{s("collection")}</h2>
        </div>
        <span>
          {adapted
            ? s("adapted")
            : s(
                experience?.variant === "comparison"
                  ? "comparison"
                  : "discovery",
              )}
        </span>
      </div>
      {adapted && (
        <details className="shop-personalization-explanation">
          <summary>{b("personalizationWhy")}</summary>
          <p>{b("personalizationExplanation")}</p>
        </details>
      )}
      <div className="shop-filters">
        <CatalogNavigation />
        <input
          aria-label={s("search")}
          placeholder={s("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div
        aria-busy={catalogLoading}
        className={`shop-grid ${experience?.variant === "comparison" || query.length > 3 ? "comparison" : ""}`}
      >
        {list.map((p) => (
          <ProductTile
            key={p.id}
            product={p}
            money={money}
            business={cart?.customerGroup === "business"}
            onViewed={() =>
              setViewed((v) => ({
                ...v,
                [p.category]: (v[p.category] ?? 0) + 1,
              }))
            }
          />
        ))}
      </div>
      <div className="shop-filters">
        {catalogLoading && <p role="status">{s("loading")}</p>}
        {pageCursor && (
          <button
            disabled={catalogLoading || busy}
            onClick={() => run(() => catalog(cart?.token))}
          >
            {s("firstPage")}
          </button>
        )}
        {nextCursor && (
          <button
            disabled={catalogLoading || busy}
            onClick={() => run(() => catalog(cart?.token, nextCursor))}
          >
            {s("nextPage")} →
          </button>
        )}
      </div>
    </section>
  );
}
