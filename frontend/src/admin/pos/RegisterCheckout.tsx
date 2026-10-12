/** Touch checkout retains explicit payment/consent choices; cash input uses integer currency units. */
import { useState } from "react";
import { decimalMinor, inputMinor, type PosCart } from "./pos-model";
import { usePosText } from "./pos-i18n";
import type { useRegister } from "./useRegister";
import { useLocale } from "../../shared/i18n/i18n";
import Icon from "../../shared/ui/Icon";
export default function RegisterCheckout({
  register: r,
}: {
  register: ReturnType<typeof useRegister>;
}) {
  const t = usePosText();
  const { locale } = useLocale();
  const [tender, setTender] = useState("");
  const [terms, setTerms] = useState(false);
  const [digital, setDigital] = useState(false);
  const [contact, setContact] = useState<Record<string, string>>({});
  const c = r.cart;
  if (!c) return null;
  const scale = c.price.currencyScale ?? 2;
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: c.price.currency,
    }).format(n);
  const payment = r.options?.payments.find(
    (p) => p.id === c.checkout.paymentMethodId,
  );
  const cash = payment?.mode === "cash";
  const received = inputMinor(tender, scale);
  const total = BigInt(c.price.totalMinor);
  const change =
    received !== null && received >= total ? received - total : null;
  const select = (value: Partial<PosCart["checkout"]>) =>
    r.select({ ...c.checkout, ...value });
  return (
    <section className="pos-payment">
      <label>
        {t("payment")}
        <select
          value={c.checkout.paymentMethodId}
          disabled={r.busy}
          onChange={(e) => void select({ paymentMethodId: e.target.value })}
        >
          {r.options?.payments.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>
          <Icon name="people" />
          {t("contact")}
        </summary>
        <div className="pos-contact">
          {(
            ["email", "first", "last", "street", "postal", "city"] as const
          ).map((k) => (
            <label key={k}>
              {t(k)}
              <input
                type={k === "email" ? "email" : "text"}
                value={contact[k] ?? ""}
                onChange={(e) =>
                  setContact({ ...contact, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <button
            disabled={r.busy}
            onClick={() =>
              void select({
                ...(contact.email ? { customerEmail: contact.email } : {}),
                ...(contact.street
                  ? {
                      billingAddress: {
                        firstName: contact.first ?? "",
                        lastName: contact.last ?? "",
                        street: contact.street,
                        postalCode: contact.postal ?? "",
                        city: contact.city ?? "",
                        country: c.checkout.country,
                      },
                    }
                  : {}),
              })
            }
          >
            {t("save")}
          </button>
        </div>
      </details>
      <div className="pos-total">
        <span>{t("total")}</span>
        <strong>{money(c.price.totalPrice)}</strong>
        <small>
          {t("tax")} ·{" "}
          {money(
            c.price.calculatedTaxes?.reduce((n, t) => n + t.tax, 0) ??
              (c.price as unknown as { tax?: number }).tax ??
              0,
          )}
        </small>
      </div>
      {cash && (
        <>
          <div className="pos-tender">
            <label>
              {t("cash")}
              <input
                inputMode="decimal"
                value={tender}
                placeholder={decimalMinor(c.price.totalMinor, scale)}
                onChange={(e) => setTender(e.target.value)}
              />
            </label>
            <button
              className="pos-exact"
              onClick={() => setTender(decimalMinor(c.price.totalMinor, scale))}
            >
              {t("exact")}
            </button>
          </div>
          <div className="pos-change" aria-live="polite">
            <span>{t("change")}</span>
            <strong>
              {change === null ? "—" : money(Number(change) / 10 ** scale)}
            </strong>
          </div>
        </>
      )}
      {c.legal?.strictCheckout && (
        <label className="pos-consent">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          {t("terms")}
        </label>
      )}
      {c.legal?.requiresDigital && (
        <label className="pos-consent">
          <input
            type="checkbox"
            checked={digital}
            onChange={(e) => setDigital(e.target.checked)}
          />
          {t("digital")}
        </label>
      )}
      <button
        className="pos-pay"
        disabled={
          r.busy ||
          !c.lineItems.length ||
          (cash && change === null) ||
          (c.legal?.strictCheckout && !terms) ||
          (c.legal?.requiresDigital && !digital)
        }
        onClick={() =>
          void r.complete(
            cash ? received!.toString() : undefined,
            terms,
            digital,
          )
        }
      >
        <Icon name="check" />
        {t(r.busy ? "busy" : "pay")}
      </button>
    </section>
  );
}
