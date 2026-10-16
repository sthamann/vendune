/** Frozen pure-decision expectations remain advanced, read-only metadata; no fake execution result is inferred. */
import type { Manifest } from "../../shared/apps/native/types";
import { useAppCapabilityText } from "../../shared/i18n/app-capability-i18n";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import Icon from "../../shared/ui/Icon";
export default function AppCapabilityChecks({
  manifest,
  onAssist,
}: {
  manifest: Manifest;
  onAssist?: (prompt: string) => void;
}) {
  const t = useAppCapabilityText(),
    { locale } = useAppStudioText(),
    { language, mainLocale } = useContentLanguage();
  const examples = manifest.capability?.examples ?? [];
  const money = (v: { minor: number; currency: string; scale: number }) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: v.currency,
      minimumFractionDigits: v.scale,
      maximumFractionDigits: v.scale,
    }).format(v.minor / 10 ** v.scale);
  return (
    <details className="app-capability-checks">
      <summary>
        <Icon name="check" size={18} />
        <span>{t("testsOptional")}</span>
        <span className="studio-badge">{examples.length}</span>
      </summary>
      {!examples.length ? (
        <p>{t("noTestsHelp")}</p>
      ) : (
        <>
          <p>{t("testSummary").replace("{count}", String(examples.length))}</p>
          <p>{t("checks")}</p>
          <div className="app-capability-examples">
            {examples.map((example) => (
              <article key={example.id}>
                <small>{t("expectedOnly")}</small>
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
        </>
      )}
      {onAssist && (
        <button
          type="button"
          className="studio-secondary"
          onClick={() => onAssist(t("testsRequest"))}
        >
          <Icon name="spark" size={16} />
          {t("prepareTests")}
        </button>
      )}
    </details>
  );
}
