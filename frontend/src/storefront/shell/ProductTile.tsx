/** Single native product card, reused by the storefront and read-only visual preview. */
import { productURL } from "../catalog/product-url";
import ImagePlaceholder from "../catalog/ImagePlaceholder";
import Icon from "../../shared/ui/Icon";
import { useShopText } from "../../shared/i18n/shop-i18n";
import type { Product } from "../../shared/api/shop-api";
export type TileProduct = Pick<Product, "id" | "name" | "price" | "media"> &
  Partial<
    Pick<
      Product,
      "description" | "stock" | "category" | "calculated_price" | "extra"
    >
  >;
export default function ProductTile({
  product: p,
  money,
  business = false,
  onViewed,
}: {
  product: TileProduct;
  money: (amount: number) => string;
  business?: boolean;
  onViewed?: () => void;
}) {
  const { s } = useShopText();
  return (
    <article className="shop-product" onMouseEnter={onViewed}>
      <a
        className="shop-product-image"
        href={productURL(p)}
        aria-label={`${s("details")}: ${p.name}`}
      >
        {p.media[0]?.url ? (
          <img
            src={p.media[0].url}
            alt={p.name}
            loading="lazy"
            width="400"
            height="320"
          />
        ) : (
          <ImagePlaceholder label={s("noImage")} />
        )}
        <span>{p.stock ? `${p.stock} ${s("available")}` : s("sold")}</span>
      </a>
      <div className="shop-product-info">
        <p className="shop-kicker">{s(p.category ?? "")}</p>
        <a href={productURL(p)}>
          <h3>{p.name}</h3>
        </a>
        <p>{p.description}</p>
        <strong>{money(p.calculated_price?.unitPrice ?? p.price)}</strong>
        <small>{s(business ? "net" : "gross")}</small>
      </div>
      <a className="shop-product-link" href={productURL(p)}>
        {s("details")}
        <Icon name="arrow" size={18} />
      </a>
    </article>
  );
}
