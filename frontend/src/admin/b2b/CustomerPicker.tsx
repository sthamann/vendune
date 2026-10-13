/** Debounced, bounded native customer search with cancellation fencing and explicit selection. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import { useB2BExperienceText } from "./experience-i18n";
import Icon from "../../shared/ui/Icon";
type Customer = {
  id: string;
  email: string;
  profile?: { firstName?: string; lastName?: string };
  customerNumber?: string;
};
export default function CustomerPicker({
  request,
  value,
  onChange,
  disabled = false,
}: {
  request: RequestFn;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useB2BExperienceText(),
    [query, setQuery] = useState(""),
    [customers, setCustomers] = useState<Customer[]>([]),
    [selected, setSelected] = useState<Customer>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void request(
        `/api/merchant/customers/lookup?limit=20&query=${encodeURIComponent(query)}`,
      )
        .then((v) => {
          if (active) {
            setCustomers(v.elements.filter((c: Customer) => c.id));
            setError("");
          }
        })
        .catch((e) => {
          if (active) {
            setCustomers([]);
            setError(e.message);
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
    <div className="b2b-customer-picker">
      <label>
        {t("customerSearch")}
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setCustomers([]);
            setLoading(true);
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {value && (
        <div className="b2b-selected-customer">
          <Icon name="people" />
          <strong>{selected?.email ?? value}</strong>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange("");
              setSelected(undefined);
            }}
          >
            {t("change")}
          </button>
        </div>
      )}
      <div
        className="b2b-customer-results"
        role="listbox"
        aria-label={t("select")}
      >
        {customers.map((c) => (
          <button
            type="button"
            role="option"
            aria-selected={value === c.id}
            key={c.id}
            disabled={disabled}
            onClick={() => {
              setSelected(c);
              onChange(c.id);
            }}
          >
            <Icon name="people" />
            <span>
              <strong>
                {[c.profile?.firstName, c.profile?.lastName]
                  .filter(Boolean)
                  .join(" ") || c.email}
              </strong>
              <small>
                {c.email} · {c.customerNumber}
              </small>
            </span>
            <Icon name="plus" />
          </button>
        ))}
      </div>
      <small role="status">
        {loading
          ? t("customerLoading")
          : !customers.length
            ? t("noCustomers")
            : null}
      </small>
    </div>
  );
}
