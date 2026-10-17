/** AI generation is an explicit reviewed proposal, with conflict protection and no automatic canvas replacement. */
import type { AppStudio } from "./useAppStudio";
import { proposalChanges } from "./app-proposal";
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import type { NativeLifecycle } from "../../shared/apps/native/types";
import { useLifecycleText } from "../../shared/i18n/native-lifecycle-i18n";
import { useWorkflowStateText } from "../../shared/i18n/workflow-state-text";
import { usePermissionText } from "../team/permission-i18n";
export default function AppProposalReview({ studio }: { studio: AppStudio }) {
  const t = useBuildingText(),
    life = useLifecycleText(),
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
        {(["models", "surfaces", "workflows", "access"] as const).map(
          (group) => (
            <div key={group}>
              <strong>
                {group === "workflows" ? life("title") : t(group)}
              </strong>
              <ul>
                {changes
                  .filter((c) => c.group === group)
                  .map((c) => (
                    <li key={c.id}>
                      <span>{t(c.kind)}</span>{" "}
                      <code>
                        {group === "workflows"
                          ? life(c.id as "order" | "quote")
                          : c.id}
                      </code>
                      {group === "workflows" &&
                        p.build.manifest.lifecycles
                          ?.filter((w) => w.object === c.id)
                          .map((w) => (
                            <WorkflowSummary
                              key={w.object}
                              contract={w}
                              mainLocale={studio.mainLocale}
                            />
                          ))}
                    </li>
                  ))}
              </ul>
              {!changes.some((c) => c.group === group) && (
                <small>{t("noChanges")}</small>
              )}
            </div>
          ),
        )}
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
function WorkflowSummary({
  contract,
  mainLocale,
}: {
  contract: NativeLifecycle;
  mainLocale: string;
}) {
  const life = useLifecycleText(),
    nativeState = useWorkflowStateText(),
    permission = usePermissionText(),
    { locale } = useLocale();
  const name = (id: string) =>
    contentText(
      contract.states.find((s) => s.id === id)?.label ?? {},
      locale,
      mainLocale,
    ) || nativeState(contract.object, id);
  return (
    <div className="app-workflow-edges">
      {contract.transitions.map((edge) => (
        <span key={edge.id}>
          <strong>{contentText(edge.label, locale, mainLocale)}</strong>
          {name(edge.from)} → {name(edge.to)}
          {edge.guards?.map((g) => (
            <small key={g}>{life(g as "payment.ready")}</small>
          ))}
          {edge.requiredPermissions?.map((scope) => (
            <small key={scope}>
              {permission(scope)} ({scope})
            </small>
          ))}
        </span>
      ))}
    </div>
  );
}
