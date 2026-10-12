/** Native RFQ inbox and merchant offers use the same versioned contract as buyer API/MCP operations. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import { useB2BQuoteText } from "../../shared/i18n/b2b-quotes-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import type { Quote } from "../../shared/b2b/quote-types";
export default function Quotes({
  request,
  busy,
  run,
}: {
  request: RequestFn;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const t = useB2BQuoteText();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const reload = async () => {
    setQuotes((await request("/api/b2b/quotes.merchant", {})).elements);
  };
  useEffect(() => {
    void reload().catch((e) => setError((e as Error).message));
  }, []);
  return (
    <section className="b2b-panel">
      {error && <p role="alert">{error}</p>}
      <header className="b2b-toolbar">
        <h2>{t("title")}</h2>
        <button disabled={busy} onClick={() => void run(reload)}>
          {t("refresh")}
        </button>
      </header>
      <p>{t("hint")}</p>
      {!quotes.length && <p>{t("empty")}</p>}
      {quotes.map((q) => (
        <Offer
          key={q.id + q.revision}
          quote={q}
          busy={busy}
          submit={async (data) => {
            await request("/api/b2b/quote.offer", {
              id: q.id,
              revision: q.revision,
              ...data,
            });
            await reload();
          }}
          run={run}
        />
      ))}
    </section>
  );
}
function Offer({
  quote: q,
  busy,
  submit,
  run,
}: {
  quote: Quote;
  busy: boolean;
  submit: (data: Record<string, unknown>) => Promise<void>;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const t = useB2BQuoteText(),
    { locale } = useLocale();
  const [message, setMessage] = useState(""),
    [until, setUntil] = useState(
      localDate(
        q.data.validUntil
          ? new Date(q.data.validUntil)
          : new Date(Date.now() + 7 * 86400000),
      ),
    );
  const [lines, setLines] = useState(
    q.data.lines ??
      q.data.quote.lineItems.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        grossMinor: Math.round(
          (i.price.unitPrice +
            (q.data.quote.customerGroup === "business"
              ? (i.price.calculatedTaxes ?? []).reduce((n, t) => n + t.tax, 0) /
                i.quantity
              : 0)) *
            10 ** (q.data.quote.price.currencyScale ?? 2),
        ),
      })),
  );
  return (
    <article className="b2b-quote">
      <header>
        <strong>
          {q.unitId} · {q.data.currency}
        </strong>
        <span>{t(q.state)}</span>
      </header>
      <p>{q.data.message}</p>
      {q.data.messages.map((m, i) => (
        <p key={i}>
          <strong>{t(m.merchant ? "merchant" : "buyer")}</strong> · {m.message}{" "}
          <small>{new Date(m.createdAt).toLocaleString(locale)}</small>
        </p>
      ))}
      {["requested", "offered"].includes(q.state) && (
        <>
          <div className="b2b-fields">
            {lines.map((l, i) => (
              <label key={l.id}>
                {q.data.quote.lineItems.find((v) => v.id === l.id)?.label} ·{" "}
                {l.quantity}
                <small>{t("price")}</small>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={l.grossMinor}
                  onChange={(e) =>
                    setLines(
                      lines.map((line, n) =>
                        n === i
                          ? { ...line, grossMinor: Number(e.target.value) }
                          : line,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <label>
              {t("expiry")}
              <input
                type="datetime-local"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </label>
          </div>
          <label>
            {t("message")}
            <textarea
              value={message}
              maxLength={4000}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <button
            disabled={
              busy ||
              !until ||
              lines.some(
                (l) => !Number.isSafeInteger(l.grossMinor) || l.grossMinor < 0,
              )
            }
            onClick={() =>
              void run(() =>
                submit({
                  message,
                  data: { lines, validUntil: new Date(until).toISOString() },
                }),
              )
            }
          >
            {t("offer")}
          </button>
        </>
      )}
    </article>
  );
}

function localDate(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
