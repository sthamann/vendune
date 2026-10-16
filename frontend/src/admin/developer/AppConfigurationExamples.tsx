/** Configuration example cards expose frozen inputs and expected guest results without computing business rules in the browser. */
import type { Manifest } from "../../shared/apps/native/types";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import { useAppCapabilityText } from "../../shared/i18n/app-capability-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
import Icon from "../../shared/ui/Icon";
export default function AppConfigurationExamples({
  manifest,
}: {
  manifest: Manifest;
}) {
  const t = useAppCapabilityText();
  const { language, mainLocale } = useContentLanguage(),
    { locale } = useLocale();
  const c = manifest.configuration;
  if (!c?.inputs?.examples?.length) return null;
  const format = c.currency
    ? new Intl.NumberFormat(locale, { style: "currency", currency: c.currency })
    : undefined;
  const scale = format?.resolvedOptions().maximumFractionDigits ?? 2;
  return (
    <div className="app-capability-examples">
      {c.inputs.examples.map((example) => (
        <article key={example.id}>
          <h4>{contentText(example.label, language, mainLocale)}</h4>
          <dl>
            {c.inputs?.fields
              .filter((field) => example.fields[field.name] !== undefined)
              .map((field) => (
                <div key={field.name}>
                  <dt>{contentText(field.label, language, mainLocale)}</dt>
                  <dd>{String(example.fields[field.name])}</dd>
                </div>
              ))}
            {example.expectedFeeMinor !== null && (
              <div>
                <dt>{t("adjustment")}</dt>
                <dd>
                  {format?.format(example.expectedFeeMinor / 10 ** scale) ??
                    example.expectedFeeMinor}
                </dd>
              </div>
            )}
          </dl>
          <p>
            <Icon
              name={example.expectedFeeMinor === null ? "close" : "check"}
              size={16}
            />
            {t(example.expectedFeeMinor === null ? "rejected" : "accepted")}
          </p>
        </article>
      ))}
    </div>
  );
}
