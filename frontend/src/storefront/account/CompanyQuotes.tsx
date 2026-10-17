/** Buyer negotiations bind an offer to its original cart; the shared checkout remains authoritative. */
import { useEffect, useState, useRef } from "react";
import { shopApi, type Cart } from "../../shared/api/shop-api";
import { useLocale } from "../../shared/i18n/i18n";
import { useB2BQuoteText } from "../../shared/i18n/b2b-quotes-i18n";
import { contentText } from "../../shared/i18n/content-language";
import type { Quote } from "../../shared/b2b/quote-types";
export default function CompanyQuotes({
  unit,
  cart,
  onCart,
  busy,
  run,
}: {
  unit: string;
  cart?: Cart;
  onCart: (c: Cart) => void;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const { locale } = useLocale();
  const generation = useRef(0);
  const [error, setError] = useState("");
  const t = useB2BQuoteText(),
    [quotes, setQuotes] = useState<Quote[]>([]),
    [message, setMessage] = useState("");
  const command = <T,>(op: string, v: unknown = {}) =>
    shopApi<T>("/store-api/b2b/" + op, v, cart?.token);
  const reload = async () => {
    const current = ++generation.current;
    const v = await command<{ elements: Quote[] }>("quotes", { unitId: unit });
    if (current === generation.current) setQuotes(v.elements);
  };
  useEffect(() => {
    setQuotes([]);
    setError("");
    void reload().catch((e) => setError((e as Error).message));
    return () => {
      generation.current++;
    };
  }, [unit]);
  const change = async (op: string, q?: Quote) => {
    const v = await command<Cart>(op, {
      id: q?.id,
      revision: q?.revision ?? cart?.revision,
      cartRevision: cart?.revision,
      message,
    });
    if (op === "quote.accept" || op === "quote.release") onCart(v);
    setMessage("");
    await reload();
  };
  return (
    <section>
      {error && <p role="alert">{error}</p>}
      <header>
        <h3>{t("title")}</h3>
        <button disabled={busy} onClick={() => void run(reload)}>
          {t("refresh")}
        </button>
      </header>
      <p>{t("hint")}</p>
      <label>
        {t("message")}
        <textarea
          value={message}
          maxLength={4000}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {cart?.b2b?.unitId === unit && (
        <nav>
          <button
            disabled={
              busy || !cart.lineItems.length || Boolean(cart.b2b.quoteId)
            }
            onClick={() => void run(() => change("quote.request"))}
          >
            {t("request")}
          </button>
          {cart.b2b.quoteId && (
            <button
              disabled={busy}
              onClick={() => void run(() => change("quote.release"))}
            >
              {t("release")}
            </button>
          )}
        </nav>
      )}
      {!quotes.length && <p>{t("empty")}</p>}
      {quotes.map((q) => (
        <article key={q.id}>
          <strong>
            {contentText(
              q.workflow?.label ?? {},
              locale,
              q.workflow?.mainLocale ?? "en-GB",
            ) ||
              t(q.state as Parameters<typeof t>[0]) ||
              q.state}{" "}
            · {q.data.currency}
          </strong>
          <ul>
            {q.data.quote.lineItems.map((i) => (
              <li key={i.id}>
                {i.quantity} × {i.label}
              </li>
            ))}
          </ul>
          {q.data.lines && (
            <ul>
              {q.data.lines.map((l) => (
                <li key={l.id}>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: q.data.currency,
                  }).format(
                    l.grossMinor /
                      10 ** (q.data.quote.price.currencyScale ?? 2),
                  )}{" "}
                  × {l.quantity}
                </li>
              ))}
            </ul>
          )}
          {q.data.validUntil && (
            <p>
              {t("expiry")} ·{" "}
              {new Date(q.data.validUntil).toLocaleString(locale)}
            </p>
          )}
          {q.data.messages.map((m, i) => (
            <p key={i}>
              <strong>{t(m.merchant ? "merchant" : "buyer")}</strong> ·{" "}
              {m.message}
            </p>
          ))}
          {(["requested", "offered"].includes(q.state) ||
            q.workflow?.preparation) && (
            <nav>
              <button
                disabled={busy || !message.trim()}
                onClick={() => void run(() => change("quote.message", q))}
              >
                {t("send")}
              </button>
              <button
                disabled={busy}
                onClick={() => void run(() => change("quote.reject", q))}
              >
                {t("reject")}
              </button>
              {q.state === "offered" && (
                <button
                  disabled={
                    busy ||
                    cart?.b2b?.unitId !== unit ||
                    Boolean(cart?.b2b?.quoteId)
                  }
                  onClick={() => void run(() => change("quote.accept", q))}
                >
                  {t("accept")}
                </button>
              )}
            </nav>
          )}
        </article>
      ))}
    </section>
  );
}
