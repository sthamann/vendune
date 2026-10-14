/** Bounded, debounced native product/SKU lookup; prices are only committed through the reviewed checkout quote. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import type { Product } from "../../shared/api/shop-api";
import { useAdminCreationText } from "../../shared/i18n/admin-creation-i18n";
export default function OrderProductPicker({
  request,
  onAdd,
  disabled,
}: {
  request: RequestFn;
  onAdd: (product: Product) => void;
  disabled: boolean;
}) {
  const { n } = useAdminCreationText();
  const [query, setQuery] = useState(""),
    [products, setProducts] = useState<Product[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      request(
        `/api/merchant/products?active=true&limit=20&search=${encodeURIComponent(query)}`,
      )
        .then((v) => {
          if (active) {
            setProducts(v.elements);
            setError("");
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setProducts([]);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, request]);
  return (
    <div>
      <label>
        {n("productSearch")}
        <input
          type="search"
          maxLength={200}
          disabled={disabled}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="admin-product-results">
        {products.map((p) => (
          <button
            type="button"
            key={p.id}
            disabled={disabled || p.stock < 1}
            onClick={() => onAdd(p)}
          >
            {p.media?.[0]?.url && <img src={p.media[0].url} alt="" />}
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.product_number ?? p.id}{" "}
                {Object.values(p.options ?? {}).join(" · ")}
              </small>
            </span>
            {n("add")}
          </button>
        ))}
      </div>
      <small role="status">
        {loading ? n("loading") : products.length ? null : n("noProducts")}
      </small>
    </div>
  );
}
