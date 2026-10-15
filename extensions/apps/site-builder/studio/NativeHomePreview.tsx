/** Preview composes the actual native header, hero, product cards and footer, without a live cart or commands. */
import HomeHero from "../../../../frontend/src/storefront/shell/HomeHero";
import ProductTile from "../../../../frontend/src/storefront/shell/ProductTile";
import { useShopText } from "../../../../frontend/src/shared/i18n/shop-i18n";
import type { SiteProduct } from "../Renderer";
export { default as PreviewHeader } from "../../../../frontend/src/storefront/shell/StorefrontHeaderView";
export { default as PreviewFooter } from "../../../../frontend/src/storefront/shell/StorefrontFooter";
export default function NativeHomePreview({
  products,
  onSelect,
}: {
  products: SiteProduct[];
  onSelect: (section: "hero" | "products") => void;
}) {
  const { s, locale } = useShopText();
  const select = (kind: "hero" | "products") => ({
    tabIndex: 0,
    role: "button",
    onClick: () => onSelect(kind),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (["Enter", " "].includes(e.key)) {
        e.preventDefault();
        onSelect(kind);
      }
    },
  });
  return (
    <main className="shop-content">
      <div
        {...select("hero")}
        aria-label={s("hero")}
        className="designer-native-region"
      >
        <HomeHero products={products} />
      </div>
      <section
        {...select("products")}
        aria-label={s("collection")}
        className="shop-collection designer-native-region"
      >
        <div className="collection-title">
          <h2>{s("collection")}</h2>
        </div>
        <div className="shop-grid">
          {products.map((p) => (
            <ProductTile
              key={p.id}
              product={p}
              money={(n) =>
                new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency: p.currency ?? "EUR",
                }).format(n)
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}
