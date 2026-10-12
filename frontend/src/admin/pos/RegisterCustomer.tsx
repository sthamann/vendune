/** Customer-number card scanner and bounded CRM search; attaching a customer stays tenant/actor/revision checked. */
import { useEffect, useRef, useState } from "react";
import Icon from "../../shared/ui/Icon";
import { usePosText } from "./pos-i18n";
import type { useRegister } from "./useRegister";
type Customer = {
  id: string;
  name: string;
  email: string;
  customerNumber: string;
};
export default function RegisterCustomer({
  register: r,
}: {
  register: ReturnType<typeof useRegister>;
}) {
  const t = usePosText();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scan = async (card?: string) => {
    const seq = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const data = await r.command(
        "customers",
        card ? { barcode: card } : { query },
      );
      if (sequence.current === seq) setCustomers(data.elements);
    } catch (e) {
      if (sequence.current === seq) setError((e as Error).message);
    } finally {
      if (sequence.current === seq) setBusy(false);
    }
  };
  useEffect(() => {
    if (!open) return;
    timer.current = setTimeout(() => void scan(), 200);
    return () => {
      clearTimeout(timer.current);
      sequence.current++;
    };
  }, [open, query, r.command]);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      dialog.current?.querySelector("input")?.focus();
    }
  }, [open]);
  const choose = async (id: string | null) => {
    await r.adjust("customer", { customerId: id });
    // A server rejection must leave the picker open; check the authoritative cart identity.
  };
  return (
    <>
      <button
        className="pos-customer-button"
        onClick={() => setOpen(true)}
        disabled={r.busy}
      >
        <span className="pos-customer-avatar">
          <Icon name={r.cart?.customerId ? "people" : "card"} />
        </span>
        <span>
          <small>{t("customer")}</small>
          <strong>{r.cart?.customerEmail || t("walkIn")}</strong>
        </span>
        <Icon name="arrow" />
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="pos-tool-dialog"
          onCancel={() => setOpen(false)}
          aria-label={t("customer")}
        >
          <header>
            <h2>{t("customer")}</h2>
            <button onClick={() => setOpen(false)} aria-label={t("close")}>
              <Icon name="close" />
            </button>
          </header>
          <form
            className="pos-search"
            onSubmit={(e) => {
              e.preventDefault();
              clearTimeout(timer.current);
              void scan(query.trim());
            }}
          >
            <Icon name="search" />
            <input
              autoFocus
              aria-label={t("customerSearch")}
              placeholder={t("customerSearch")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={200}
            />
            <button disabled={busy || !query.trim()}>
              {t("customerCard")}
            </button>
          </form>
          <p className="pos-tool-hint">{t("cardHint")}</p>
          {busy && <p role="status">{t("busy")}</p>}
          {error && <p role="alert">{error}</p>}
          {!busy && !customers.length && <p>{t("customerNone")}</p>}
          <div className="pos-customer-results">
            {customers.map((c) => (
              <button
                key={c.id}
                disabled={r.busy}
                aria-pressed={r.cart?.customerId === c.id}
                onClick={() => void choose(c.id)}
              >
                <span>
                  <strong>{c.name || c.email}</strong>
                  <small>
                    {c.email} · {c.customerNumber}
                  </small>
                </span>
                <span>
                  {r.cart?.customerId === c.id ? (
                    <Icon name="check" />
                  ) : (
                    t("selectCustomer")
                  )}
                </span>
              </button>
            ))}
          </div>
          {r.error && <p role="alert">{r.error}</p>}
          {r.cart?.customerId && (
            <button disabled={r.busy} onClick={() => void choose(null)}>
              {t("removeCustomer")}
            </button>
          )}
          <footer>
            <button onClick={() => setOpen(false)}>{t("close")}</button>
          </footer>
        </dialog>
      )}
    </>
  );
}
