/** Checkout, receipts and Studio render the same frozen configuration, without fetching a newer app or private library. */
import type { ConfigurationSnapshot } from "../api/configuration-types";
import { getContentLocale } from "../api/shop-api";
import { contentText } from "../i18n/content-language";
import { useAppText } from "../i18n/app-i18n";
import "./configuration-summary.css";

export default function ConfigurationSummary({
  configurations,
  language,
}: {
  configurations?: ConfigurationSnapshot[];
  language?: string;
}) {
  const { a, locale } = useAppText();
  if (!configurations?.length) return null;
  const selected = language ?? getContentLocale();
  return (
    <div className="app-configuration-summaries">
      {configurations.map((config, index) => {
        const frozen = config.presentation;
        const main = frozen?.mainLocale ?? selected;
        const text = (value: unknown): string => {
          if (typeof value === "boolean")
            return a(value ? "configurationYes" : "configurationNo");
          if (value && typeof value === "object")
            return contentText(
              Object.fromEntries(
                Object.entries(value).filter(([, v]) => typeof v === "string"),
              ),
              selected,
              main,
            );
          return value == null ? "" : String(value);
        };
        const fields =
          frozen?.fields ??
          Object.entries(config.fields ?? { text: config.text ?? "" }).map(
            ([name, value]) => ({
              label: { [selected]: name.replaceAll("_", " ") },
              value,
            }),
          );
        const source =
          config.currency && /^[A-Z]{3}$/.test(config.currency)
            ? new Intl.NumberFormat(locale, {
                style: "currency",
                currency: config.currency,
              })
            : undefined;
        return (
          <section
            className="app-configuration-summary"
            key={`${config.app ?? ""}:${index}`}
          >
            <strong>
              {frozen
                ? contentText(frozen.title, selected, main)
                : a("configurationDetails")}
            </strong>
            <dl>
              {fields.map((field, i) => (
                <div key={i}>
                  <dt>{contentText(field.label, selected, main)}</dt>
                  <dd>{text(field.value)}</dd>
                </div>
              ))}
              {source && Number.isSafeInteger(config.feeMinor) && (
                <div>
                  <dt>{a("surcharge")}</dt>
                  <dd>
                    {source.format(
                      config.feeMinor /
                        10 **
                          (source.resolvedOptions().maximumFractionDigits ?? 2),
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
