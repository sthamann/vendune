/** Contextual agent drawer retains the shared proposal workflow and draft while the native dialog manages focus. */
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "../../shared/ui/Icon";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import { useAppWorkspaceText } from "../../shared/i18n/app-workspace-i18n";
import type { RequestFn } from "../shell/studio-types";
import type { AppStudio } from "./useAppStudio";
import AppAgentPanel from "./AppAgentPanel";
export default function AppAgentDrawer({
  open,
  onClose,
  studio,
  request,
}: {
  open: boolean;
  onClose: () => void;
  studio: AppStudio;
  request: RequestFn;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    title = useId();
  const t = useAppWorkspaceText(),
    { locale } = useLocale();
  useEffect(() => {
    const el = dialog.current!;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);
  return createPortal(
    <dialog
      ref={dialog}
      className="app-studio app-agent-drawer"
      aria-labelledby={title}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <header className="app-agent-drawer-header">
        <span className="app-agent-badge">
          <Icon name="spark" size={20} />
        </span>
        <div>
          <h2 id={title}>{t("agentTitle")}</h2>
          <p>
            {t("agentContext")} ·{" "}
            {contentText(studio.manifest.name, locale, studio.mainLocale) ||
              studio.manifest.id}
          </p>
        </div>
        <button
          type="button"
          className="app-icon-button"
          aria-label={t("agentClose")}
          onClick={onClose}
          autoFocus
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      <p className="app-agent-drawer-hint">{t("agentHint")}</p>
      <fieldset disabled={studio.busy} className="app-agent-drawer-body">
        <AppAgentPanel
          key={studio.manifest.id}
          studio={studio}
          request={request}
        />
      </fieldset>
    </dialog>,
    document.querySelector(".studio") ?? document.body,
  );
}
