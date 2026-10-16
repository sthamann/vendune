/** Merchant ideas, requirements and explicit agent handoff edit the canonical versioned Manifest without executing changes. */
import "../styles/app-capability.css";
import type { Manifest } from "../../shared/apps/native/types";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { useAppCapabilityText } from "../../shared/i18n/app-capability-i18n";
import { contentKey, contentText } from "../../shared/i18n/content-language";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import { useLocale } from "../../shared/i18n/i18n";
import Icon from "../../shared/ui/Icon";
import { textMap } from "./app-model";
import AppCapabilityChecks from "./AppCapabilityChecks";
export default function AppCapabilityEditor({
  manifest,
  onChange,
  onAssist,
  onDesign,
}: {
  manifest: Manifest;
  onChange: (m: Manifest) => void;
  onAssist?: (prompt: string) => void;
  onDesign?: () => void;
}) {
  const t = useAppCapabilityText(),
    { language, mainLocale, locales, select } = useContentLanguage();
  const { locale } = useLocale();
  const contract = manifest.capability ?? {
    version: 1 as const,
    intent: {},
    assumptions: [],
    examples: [],
  };
  const update = (patch: Partial<typeof contract>) =>
    onChange({ ...manifest, capability: { ...contract, ...patch } });
  const goal = contentText(contract.intent, language, mainLocale).trim();
  const hasBrief =
    !!manifest.capability &&
    (Object.keys(contract.intent).length > 0 ||
      contract.assumptions.length > 0);
  const missingMain =
    hasBrief &&
    [contract.intent, ...contract.assumptions].some(
      (value) => !contentText(value, mainLocale, mainLocale).trim(),
    );
  const needsMain = (value: Manifest["name"]) =>
    hasBrief &&
    language === mainLocale &&
    !contentText(value, mainLocale, mainLocale).trim()
      ? t("requiredMain")
      : undefined;
  return (
    <section className="app-capability-editor">
      <header>
        <span className="app-intent-emblem">
          <Icon name="spark" size={24} />
        </span>
        <div>
          <h2>{t("capability")}</h2>
          <p>{t("ideaHint")}</p>
        </div>
      </header>
      {missingMain && (
        <div className="app-intent-main-needed" role="alert">
          <p>
            {t("mainNeeded").replace(
              "{language}",
              new Intl.DisplayNames([locale], { type: "language" }).of(
                mainLocale,
              ) ?? mainLocale,
            )}
          </p>
          {language !== mainLocale && (
            <button
              type="button"
              className="studio-secondary"
              onClick={() => select(mainLocale)}
            >
              {t("editMain")}
            </button>
          )}
        </div>
      )}
      <div className="app-intent-layout">
        <div className="app-intent-main">
          <LocalizedField
            label={t("intent")}
            error={needsMain(contract.intent)}
            value={contract.intent}
            onChange={(value) => update({ intent: textMap(value) })}
            multiline
            maxLength={2000}
            placeholder={t("goalPlaceholder")}
            required
          />
          <p className="app-intent-help">{t("goalHelp")}</p>
          <div className="app-intent-actions">
            {onAssist && (
              <button
                type="button"
                className="studio-primary"
                disabled={!goal}
                onClick={() =>
                  onAssist(t("agentRequest").replace("{goal}", goal))
                }
              >
                <Icon name="spark" size={17} />
                {t("agentContinue")}
              </button>
            )}
            {onDesign && !!manifest.views?.length && (
              <button
                type="button"
                className="studio-secondary"
                onClick={onDesign}
              >
                <Icon name="palette" size={17} />
                {t("designContinue")}
              </button>
            )}
          </div>
          <div className="app-intent-inspiration">
            <h3>{t("inspiration")}</h3>
            <div className="app-intent-ideas">
              {(
                [
                  ["advisorIdea", "advisorGoal", "box"],
                  ["bannerIdea", "bannerGoal", "frame"],
                  ["approvalIdea", "approvalGoal", "building"],
                ] as const
              ).map(([title, prompt, icon]) => (
                <button
                  type="button"
                  key={title}
                  onClick={() =>
                    update({
                      intent: {
                        ...contract.intent,
                        [contentKey(contract.intent, language, locales)]:
                          t(prompt),
                      },
                    })
                  }
                >
                  <Icon name={icon} size={22} />
                  <span>{t(title)}</span>
                  <Icon name="arrow" size={16} />
                </button>
              ))}
            </div>
          </div>
          <section className="app-intent-requirements">
            <h3>{t("assumptions")}</h3>
            <p>{t("requirementsHelp")}</p>
            {contract.assumptions.map((value, index) => (
              <div className="app-capability-assumption" key={index}>
                <LocalizedField
                  label={t("requirement").replace(
                    "{number}",
                    String(index + 1),
                  )}
                  value={value}
                  error={needsMain(value)}
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
                      assumptions: contract.assumptions.filter(
                        (_, i) => i !== index,
                      ),
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
              onClick={() =>
                update({ assumptions: [...contract.assumptions, {}] })
              }
            >
              <Icon name="plus" size={16} />
              {t("add")}
            </button>
          </section>
        </div>
        <aside className="app-intent-guide" aria-label={t("guideTitle")}>
          <h3>{t("guideTitle")}</h3>
          <ol>
            {(
              [
                ["stepDescribe", "describeHelp"],
                ["stepPropose", "proposeHelp"],
                ["stepPreview", "previewHelp"],
              ] as const
            ).map(([title, hint]) => (
              <li key={title}>
                <strong>{t(title)}</strong>
                <p>{t(hint)}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      <AppCapabilityChecks manifest={manifest} onAssist={onAssist} />
    </section>
  );
}
