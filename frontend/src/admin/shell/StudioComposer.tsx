/** StudioComposer: focused Studio view; state and commands come from the session-scoped controller. */
import { lazy, Suspense, useState } from "react";
import { useCatalogIntakeText } from "../../shared/i18n/catalog-intake-i18n";
import type { IntakeMode } from "../catalog/catalog-intake-model";
import "../styles/catalog-intake.css";
const CatalogIntake = lazy(() => import("../catalog/CatalogIntake"));
import { locales } from "../../shared/i18n/i18n";
import "../../shared/styles/workbench.css";
import Icon from "../../shared/ui/Icon";
import "../styles/operations.css";
import "../styles/studio.css";

import { useStudio } from "./StudioContext";

export default function StudioComposer() {
  const c = useCatalogIntakeText();
  const [intake, setIntake] = useState<IntakeMode>();
  const {
    access,
    workspace,
    environment,
    send,
    t,
    composer,
    draft,
    setDraft,
    connected,
    busy,
    locale,
  } = useStudio();
  return (
    <div className="composer-wrap">
      {connected && access.includes("catalog.write") && (
        <div className="merchant-catalog-actions">
          {(
            [
              ["csv", "table"],
              ["url", "link"],
              ["demo", "spark"],
            ] as const
          ).map(([mode, icon]) => (
            <button
              type="button"
              key={mode}
              disabled={busy}
              onClick={() => setIntake(mode)}
            >
              <Icon name={icon} size={15} />
              {c(mode)}
            </button>
          ))}
        </div>
      )}
      {intake && connected && access.includes("catalog.write") && (
        <Suspense fallback={null}>
          <CatalogIntake
            key={`${workspace}:${environment}:${locale}`}
            initialMode={intake}
            onClose={() => setIntake(undefined)}
          />
        </Suspense>
      )}
      <form
        className="studio-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="studio-message">
          {t("message")}
        </label>
        <textarea
          id="studio-message"
          ref={composer}
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={t("placeholder")}
        />
        <div>
          <span>
            <Icon name="lock" size={13} />
            {t("trust")}
          </span>
          <button
            type="submit"
            className="studio-primary"
            disabled={!connected || busy || !draft.trim()}
            aria-label={t("send")}
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>
      <small>
        {t("currentLocale")}: {locales[locale]} · {t("savedLanguage")}
      </small>
    </div>
  );
}
