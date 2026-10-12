/** Discretionary discounts send exact integer requests, never alter browser totals; shared pricing supplies tax and audit. */
import { useState } from "react";
import Icon from "../../shared/ui/Icon";
import { useLocale } from "../../shared/i18n/i18n";
import { inputMinor } from "./pos-model";
import { usePosText } from "./pos-i18n";
import type { useRegister } from "./useRegister";
export default function RegisterDiscount({
  register: r,
}: {
  register: ReturnType<typeof useRegister>;
}) {
  const t = usePosText();
  const { locale } = useLocale();
  const [kind, setKind] = useState("percent");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const cart = r.cart!;
  const amount = inputMinor(
    value,
    kind === "percent" ? 2 : cart.price.currencyScale,
  );
  const valid =
    amount !== null &&
    amount > 0n &&
    amount <= BigInt(Number.MAX_SAFE_INTEGER) &&
    (kind !== "percent" || amount <= 10000n);
  return (
    <details className="pos-discount">
      <summary>
        <Icon name="percent" />
        {t("discount")}
        {cart.posDiscount && (
          <strong>
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency: cart.price.currency,
            }).format(
              Number(cart.posDiscount.minor) / 10 ** cart.price.currencyScale,
            )}
          </strong>
        )}
      </summary>
      <p className="pos-tool-hint">{t("discountHint")}</p>
      <div className="pos-segment" role="group" aria-label={t("discount")}>
        {(["percent", "fixed"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setValue("");
            }}
          >
            {t(k === "percent" ? "percentage" : "fixed")}
          </button>
        ))}
      </div>
      {kind === "percent" && (
        <div className="pos-discount-presets">
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue(String(n))}
              aria-pressed={value === String(n)}
            >
              {n}%
            </button>
          ))}
        </div>
      )}
      <form
        className="pos-tool-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && reason.trim())
            void r.adjust("discount", {
              discount: {
                kind,
                value: Number(amount),
                currency: cart.price.currency,
                reason: reason.trim(),
              },
            });
        }}
      >
        <label>
          {t(kind === "percent" ? "percentage" : "amount")}
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <label>
          {t("reason")}
          <input
            required
            value={reason}
            maxLength={240}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button disabled={r.busy || !valid || !reason.trim()}>
          {t("apply")}
        </button>
      </form>
      {cart.posDiscount && (
        <div className="pos-applied-discount">
          <small>{cart.posDiscount.reason}</small>
          <button
            disabled={r.busy}
            onClick={() => void r.adjust("discount", { discount: null })}
          >
            {t("remove")}
          </button>
        </div>
      )}
    </details>
  );
}
