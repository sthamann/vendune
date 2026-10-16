/** Bounded native catalogue search, not the sampled dashboard; stale replies never replace current results. */
import { useEffect, useState } from "react";
import type { Product, RequestFn } from "../shell/studio-types";
import { useKnowledgeText } from "../../shared/i18n/knowledge-i18n";
import Icon from "../../shared/ui/Icon";
export default function GuardrailProductSearch({
  request,
  products,
  selected,
  disabled,
  onAdd,
}: {
  request: RequestFn;
  products: Product[];
  selected: string[];
  disabled: boolean;
  onAdd: (p: Product) => void;
}) {
  const k = useKnowledgeText();
  const [query, setQuery] = useState(""),
    [results, setResults] = useState(products),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setBusy(true);
      setError("");
      request(
        `/api/merchant/products?limit=20&search=${encodeURIComponent(query)}`,
      )
        .then((v) => {
          if (active) setResults(v.elements);
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setResults([]);
          }
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, request]);
  return (
    <div className="guardrail-search">
      <label>
        {k("policySearch")}
        <input
          type="search"
          maxLength={200}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]);
            setBusy(true);
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="guardrail-search-results">
        {results.map((p) => (
          <button
            className="guardrail-search-product"
            type="button"
            aria-label={`${p.name} · ${k(selected.includes(p.id) ? "policyAdded" : "policyAdd")}`}
            key={p.id}
            disabled={disabled || busy || selected.includes(p.id)}
            onClick={() => onAdd(p)}
          >
            {p.media?.[0]?.url ? (
              <img src={p.media[0].url} alt="" />
            ) : (
              <span className="guardrail-product-icon">
                <Icon name="box" />
              </span>
            )}
            <span>
              <strong>{p.name}</strong>
              <small>
                {selected.includes(p.id) ? k("policyAdded") : k("policyAdd")}
              </small>
            </span>
            <Icon name={selected.includes(p.id) ? "check" : "plus"} />
          </button>
        ))}
      </div>
      <small role="status">
        {busy
          ? k("loading")
          : !results.length && !error
            ? k("policyNoResults")
            : null}
      </small>
    </div>
  );
}
