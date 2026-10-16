/** Currency-aware editing of one native product corridor, with honest product/configuration links. */
import { useEffect, useState } from "react";
import type { Product, RequestFn } from "../shell/studio-types";
import { useKnowledgeText } from "../../shared/i18n/knowledge-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import Icon from "../../shared/ui/Icon";
import { hydrateDraft, productName } from "../catalog/catalog-model";
import type { Corridor, Settings } from "./guardrail-model";
export default function GuardrailProductCard({
  row,
  product,
  settings,
  request,
  catalogAccess,
  disabled,
  navigationDisabled,
  onChange,
  onRemove,
  onOpen,
}: {
  row: Corridor;
  product?: Product;
  settings: Settings;
  request: RequestFn;
  catalogAccess: boolean;
  disabled: boolean;
  navigationDisabled: boolean;
  onChange: (value: Partial<Corridor>) => void;
  onRemove: () => void;
  onOpen?: () => void;
}) {
  const k = useKnowledgeText(),
    { locale } = useLocale();
  const [loaded, setCurrent] =
      useState<Pick<Product, "id" | "name" | "price" | "extra">>(),
    [error, setError] = useState("");
  useEffect(() => {
    if (!catalogAccess || product) return;
    let active = true;
    request(`/api/merchant/products/${encodeURIComponent(row.productId)}`)
      .then((p) => {
        if (active) {
          const draft = hydrateDraft(p);
          setCurrent({
            id: p.id,
            name: productName(draft, locale),
            price: draft.commerce.price,
            extra: draft.extra,
          });
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request, product, row.productId, catalogAccess, locale]);
  const current = product ?? loaded;
  const scale = settings.currencies?.definitions.find(
    (c) => c.code === row.currency,
  )?.scale;
  const mismatch =
    scale === undefined ||
    (!!current &&
      (current.extra?.priceCurrency ?? settings.currencies?.pricingCurrency) !==
        row.currency);
  const factor = 10 ** (scale ?? 0);
  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: row.currency,
      minimumFractionDigits: scale,
      maximumFractionDigits: scale,
    }).format(value);
  const field = (
    key:
      | "minimumMinor"
      | "maximumMinor"
      | "minimumMarginBps"
      | "unitCostNetMinor"
      | "maximumDiscountBps",
    label: string,
    amount: boolean,
    optional = false,
  ) => (
    <label key={key}>
      {label}
      {amount ? ` · ${row.currency}` : ""}
      <input
        type="number"
        min={0}
        max={amount ? 1e12 / factor : key === "minimumMarginBps" ? 99.99 : 100}
        step={amount ? 1 / factor : 0.01}
        required={!optional}
        value={row[key] == null ? "" : row[key]! / (amount ? factor : 100)}
        onChange={(e) =>
          onChange({
            [key]:
              e.target.value === "" && optional
                ? null
                : Math.round(Number(e.target.value) * (amount ? factor : 100)),
          })
        }
      />
    </label>
  );
  return (
    <article className="guardrail-product-card">
      <header>
        <span className="guardrail-product-icon">
          <Icon name="box" />
        </span>
        <div>
          <h3>{current?.name ?? row.productId}</h3>
          <small>
            {current
              ? `${k("policyCurrent")}: ${money(current.price)}`
              : row.currency}
          </small>
        </div>
        {onOpen && (
          <button
            type="button"
            className="studio-secondary"
            disabled={navigationDisabled}
            onClick={onOpen}
          >
            {k("policyOpenProduct")}
            <Icon name="arrow" />
          </button>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {mismatch && (
        <p className="knowledge-alert" role="alert">
          {k("policyMismatch")}
        </p>
      )}
      <fieldset disabled={disabled || mismatch}>
        <legend>{k("policyRange")}</legend>
        <div className="guardrail-fields">
          {field("minimumMinor", k("policyMinimum"), true)}
          {field("maximumMinor", k("policyMaximum"), true)}
        </div>
        {row.minimumMinor > row.maximumMinor && (
          <p role="alert">{k("policyInvalid")}</p>
        )}
        <label className="guardrail-check">
          <input
            type="checkbox"
            checked={!!row.priceLocked}
            onChange={(e) => onChange({ priceLocked: e.target.checked })}
          />
          {k("priceLocked")}
        </label>
        <details>
          <summary>{k("policyFinancial")}</summary>
          <div className="guardrail-fields">
            {field("unitCostNetMinor", k("policyCost"), true, true)}
            {field("minimumMarginBps", k("policyMargin"), false)}
            {field("maximumDiscountBps", k("policyDiscount"), false, true)}
          </div>
          <p className="muted">{k("policyFinancialHint")}</p>
          <label className="guardrail-check">
            <input
              type="checkbox"
              checked={!!row.requireAvailable}
              onChange={(e) => onChange({ requireAvailable: e.target.checked })}
            />
            {k("requireAvailable")}
          </label>
        </details>
      </fieldset>
      <button
        type="button"
        className="guardrail-remove"
        disabled={disabled}
        onClick={onRemove}
      >
        <Icon name="close" />
        {k("removeCorridor")}
      </button>
    </article>
  );
}
