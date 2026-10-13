/** StudioHeader: focused Studio view; state and commands come from the session-scoped controller. */
import { useShopText } from "../../shared/i18n/shop-i18n";
import { surfaceLabel } from "../../shared/apps/AppSurfaces";
import { locales } from "../../shared/i18n/i18n";
import "../../shared/styles/workbench.css";
import Icon from "../../shared/ui/Icon";
import "../styles/operations.css";
import "../styles/studio.css";

import { canOpenStudio } from "./permissions";
import { useStudio } from "./StudioContext";
import { useState } from "react";
import { useExperienceUIText } from "../../shared/i18n/experience-ui-i18n";
import WorkspaceCopilot from "../assistant/WorkspaceCopilot";

export default function StudioHeader() {
  const { s } = useShopText();
  const [copilot, setCopilot] = useState(false);
  const { u } = useExperienceUIText();
  const {
    t,
    access,
    setMenu,
    menu,
    workspaceName,
    appSurface,
    locale,
    tabLabel,
    tab,
    connected,
    connectionPending,
    retryConnection,
    auth,
    w,
    environment,
    setEnvironment,
    setId,
    setMessages,
    environments,
    setPreviewOpen,
    x,
    setLocale,
    setTheme,
    theme,
    busy,
    run,
    refresh,
    selectTab,
  } = useStudio();
  return (
    <header className="studio-topbar">
      <div>
        <button
          className="icon-button mobile-menu"
          aria-label={t("studio")}
          onClick={() => setMenu(!menu)}
        >
          <Icon name="menu" />
        </button>
        <span className="breadcrumb">
          {workspaceName} <span>/</span>{" "}
          <strong>
            {appSurface ? surfaceLabel(appSurface, locale) : tabLabel(tab)}
          </strong>
        </span>
      </div>
      <div className="topbar-actions">
        <button
          className="studio-secondary studio-signout"
          aria-label={s("logout")}
          onClick={auth.logout}
        >
          <Icon name="logout" size={18} />
          <span>{s("logout")}</span>
        </button>
        {canOpenStudio("assistant", access) && (
          <button
            className="copilot-launch"
            aria-label={u("copilot")}
            aria-haspopup={
              tab === "assistant" && !appSurface ? undefined : "dialog"
            }
            onClick={() =>
              tab === "assistant" && !appSurface
                ? document.getElementById("studio-message")?.focus()
                : setCopilot(true)
            }
          >
            <Icon name="spark" size={18} />
            <span>{u("copilot")}</span>
          </button>
        )}
        {auth.active && access.includes("environments.read") && (
          <select
            className="environment-switch"
            aria-label={w("environments")}
            value={environment}
            disabled={connectionPending}
            onChange={(e) => {
              setEnvironment(e.target.value);
              setId(undefined);
              setMessages([]);
            }}
          >
            <option value="">{w("live")}</option>
            {environments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
        <button
          className="icon-button mobile-preview-button"
          aria-label={t("livePreview")}
          onClick={() => setPreviewOpen(true)}
        >
          <Icon name="box" />
        </button>
        <span className="connection-state">
          <i className={connected ? "on" : ""} />
          {connected
            ? t("connected")
            : auth.active
              ? x(connectionPending ? "loadingWorkspace" : "serverUnavailable")
              : x("studioSignedOut")}
        </span>
        <select
          aria-label={t("language")}
          value={locale}
          onChange={(e) => setLocale(e.target.value as typeof locale)}
        >
          {Object.entries(locales).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label={t("theme")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <button
          className={auth.active ? "icon-button" : "studio-primary"}
          aria-label={auth.active ? t("refresh") : x("studioSignIn")}
          disabled={busy || connectionPending}
          onClick={() =>
            connected
              ? run(refresh)
              : auth.active
                ? retryConnection()
                : selectTab("users")
          }
        >
          {auth.active ? (
            <Icon name="refresh" size={18} />
          ) : (
            <>
              <Icon name="link" size={16} />
              <span>{x("studioSignIn")}</span>
            </>
          )}
        </button>
      </div>
      {copilot && canOpenStudio("assistant", access) && (
        <WorkspaceCopilot onClose={() => setCopilot(false)} />
      )}
    </header>
  );
}
