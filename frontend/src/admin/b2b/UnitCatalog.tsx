/** Search the canonical merchant catalog; unit permissions persist through the native revision-bound catalog API. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
export default function UnitCatalog({
  request,
  ids,
  onChange,
  disabled,
}: {
  request: RequestFn;
  ids: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const t = useB2BText(),
    [query, setQuery] = useState(""),
    [rows, setRows] = useState<
      { id: string; name: string; productNumber?: string }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void request(
        "/api/merchant/products?limit=20&search=" + encodeURIComponent(query),
      )
        .then((v) => {
          if (active) {
            setRows(v.elements);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, query]);
  return (
    <section className="b2b-catalog">
      <h3>{t("catalog")}</h3>
      <label>
        {t("searchProducts")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="b2b-unit-tabs">
        {rows.map((p) => (
          <button
            key={p.id}
            disabled={disabled || (!ids.includes(p.id) && ids.length >= 1000)}
            aria-pressed={ids.includes(p.id)}
            onClick={() =>
              onChange(
                ids.includes(p.id)
                  ? ids.filter((id) => id !== p.id)
                  : [...ids, p.id],
              )
            }
          >
            {p.name} · {p.productNumber ?? p.id}
          </button>
        ))}
      </div>
      <p>
        {t("selectedProducts")} · {ids.length}/1000
      </p>
      <div className="b2b-unit-tabs">
        {ids.map((id) => (
          <button
            key={id}
            disabled={disabled}
            onClick={() => onChange(ids.filter((x) => x !== id))}
          >
            {rows.find((p) => p.id === id)?.name ?? id} ×
          </button>
        ))}
      </div>
    </section>
  );
}
