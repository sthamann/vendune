/** The canonical Manifest carries merchant intent and bounded pure-decision examples; no separate app document or executor. */
import type { Manifest } from "../../shared/apps/native/types";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { useAppCapabilityText } from "../../shared/i18n/app-capability-i18n";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import AppConfigurationExamples from "./AppConfigurationExamples";
import Icon from "../../shared/ui/Icon";
import { textMap } from "./app-model";
export default function AppCapabilityEditor({
  manifest,
  onChange,
}: {
  manifest: Manifest;
  onChange: (m: Manifest) => void;
}) {
  const t = useAppCapabilityText(),
    { locale } = useAppStudioText();
  const { language, mainLocale } = useContentLanguage();
  const contract = manifest.capability ?? {
    version: 1 as const,
    intent: {},
    assumptions: [],
    examples: [],
  };
  const update = (patch: Partial<typeof contract>) =>
    onChange({ ...manifest, capability: { ...contract, ...patch } });
  const money = (v: { minor: number; currency: string; scale: number }) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: v.currency,
      minimumFractionDigits: v.scale,
      maximumFractionDigits: v.scale,
    }).format(v.minor / 10 ** v.scale);
  return (
    <section className="app-capability-editor">
      <header>
        <Icon name="spark" size={24} />
        <div>
          <h2>{t("capability")}</h2>
          <p>{t("hint")}</p>
        </div>
      </header>
      <LocalizedField
        label={t("intent")}
        value={contract.intent}
        onChange={(value) => update({ intent: textMap(value) })}
        multiline
        maxLength={2000}
        required
      />
      <h3>{t("assumptions")}</h3>
      {contract.assumptions.map((value, index) => (
        <div className="app-capability-assumption" key={index}>
          <LocalizedField
            label={t("assumptions")}
            value={value}
            multiline
            maxLength={2000}
            onChange={(v) =>
              update({
                assumptions: contract.assumptions.map((prior, i) =>
                  i === index ? textMap(v) : prior,
                ),
              })
            }
          />
          <button
            type="button"
            className="app-icon-button"
            aria-label={t("remove")}
            onClick={() =>
              update({
                assumptions: contract.assumptions.filter((_, i) => i !== index),
              })
            }
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="studio-secondary"
        disabled={contract.assumptions.length >= 12}
        onClick={() => update({ assumptions: [...contract.assumptions, {}] })}
      >
        <Icon name="plus" size={16} />
        {t("add")}
      </button>
      <h3>{t("examples")}</h3>
      <p>{t("checks")}</p>
      {!contract.examples.length &&
        !manifest.configuration?.inputs?.examples?.length && (
          <p className="studio-empty">{t("empty")}</p>
        )}
      <AppConfigurationExamples manifest={manifest} />
      <div className="app-capability-examples">
        {contract.examples.map((example) => (
          <article key={example.id}>
            <h4>{contentText(example.label, language, mainLocale)}</h4>
            <span className="studio-badge">{t(example.hook)}</span>
            <dl>
              <div>
                <dt>{t("subtotal")}</dt>
                <dd>{money(example.snapshot.subtotal)}</dd>
              </div>
              <div>
                <dt>{t("adjustment")}</dt>
                <dd>{money(example.expected.adjustment)}</dd>
              </div>
            </dl>
            <p>
              <Icon
                name={example.expected.accepted ? "check" : "close"}
                size={16}
              />
              {t(example.expected.accepted ? "accepted" : "rejected")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
