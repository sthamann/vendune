/** AI generation is an explicit reviewed proposal, with conflict protection and no automatic canvas replacement. */
import type { AppStudio } from "./useAppStudio";
import { proposalChanges } from "./app-proposal";
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
export default function AppProposalReview({ studio }: { studio: AppStudio }) {
  const t = useBuildingText(),
    { locale } = useLocale(),
    p = studio.proposal;
  if (!p) return null;
  const stale =
      p.base !== JSON.stringify(studio.manifest) ||
      p.build.environment !== studio.env,
    changes = proposalChanges(studio.manifest, p.build.manifest);
  return (
    <section className="app-proposal" aria-label={t("proposal")}>
      <h3>{t("proposal")}</h3>
      <p>{t("proposalHint")}</p>
      <p>{contentText(p.build.summary, locale, studio.mainLocale)}</p>
      <div className="app-proposal-groups">
        {(["models", "surfaces", "access"] as const).map((group) => (
          <div key={group}>
            <strong>{t(group)}</strong>
            <ul>
              {changes
                .filter((c) => c.group === group)
                .map((c) => (
                  <li key={c.id}>
                    <span>{t(c.kind)}</span> <code>{c.id}</code>
                  </li>
                ))}
            </ul>
            {!changes.some((c) => c.group === group) && (
              <small>{t("noChanges")}</small>
            )}
          </div>
        ))}
      </div>
      {stale && <p role="alert">{t("conflict")}</p>}
      <div className="app-agent-options">
        <button
          type="button"
          className="studio-primary"
          disabled={stale || studio.busy}
          onClick={studio.acceptProposal}
        >
          {t("accept")}
        </button>
        <button
          type="button"
          className="studio-secondary"
          onClick={studio.discardProposal}
        >
          {t("discard")}
        </button>
      </div>
    </section>
  );
}
