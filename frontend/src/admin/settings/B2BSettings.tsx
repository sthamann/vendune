/** B2B controls edit the shared revisioned settings aggregate; no separate policy store or checkout engine. */
import "../../shared/b2b/b2b.css";
import "../styles/b2b-settings.css";
import { useEffect } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { Config } from "../../shared/api/shop-api";
import { useSettingsDraft } from "./useSettingsDraft";
import SettingsSaveBar from "./SettingsSaveBar";
import EntityHistory from "../../shared/history/EntityHistory";
import { useB2BExperienceText } from "../b2b/experience-i18n";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
import Icon, { type IconName } from "../../shared/ui/Icon";
export type B2BFeatures = {
  enabled: boolean;
  quotes: boolean;
  approvals: boolean;
  lists: boolean;
  quickOrder: boolean;
  edi: boolean;
  catalogs: boolean;
};
export const defaultB2BFeatures: B2BFeatures = {
  enabled: true,
  quotes: true,
  approvals: true,
  lists: true,
  quickOrder: true,
  edi: true,
  catalogs: true,
};
export default function B2BSettings({
  request,
  canWrite,
  onDirty,
  onCompanies,
}: {
  request: RequestFn;
  canWrite: boolean;
  onDirty?: (v: boolean) => void;
  onCompanies?: () => void;
}) {
  const t = useB2BExperienceText(),
    b = useB2BText(),
    state = useSettingsDraft<Config & { b2b?: B2BFeatures }>(
      request,
      "/api/merchant/commerce",
    );
  useEffect(() => onDirty?.(state.dirty), [state.dirty, onDirty]);
  if (!state.value)
    return (
      <p role={state.error ? "alert" : "status"}>
        {state.error || b("loading")}
      </p>
    );
  const features = { ...defaultB2BFeatures, ...state.value.data.b2b };
  const icons: Record<keyof Omit<B2BFeatures, "enabled">, IconName> = {
    quotes: "chat",
    approvals: "check",
    lists: "layers",
    quickOrder: "box",
    edi: "code",
    catalogs: "lock",
  };
  const change = (patch: Partial<B2BFeatures>) =>
    state.change({ ...state.value!.data, b2b: { ...features, ...patch } });
  return (
    <section className="studio-card settings-panel b2b-settings">
      <header className="settings-panel-header">
        <div>
          <h2>{t("settings")}</h2>
          <p>{t("settingsHint")}</p>
        </div>
        {onCompanies && (
          <button className="studio-secondary" onClick={onCompanies}>
            {t("companies")} ↗
          </button>
        )}
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canWrite) void state.save();
        }}
      >
        <fieldset className="intl-fields" disabled={!canWrite || state.busy}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={features.enabled}
              onChange={(e) => change({ enabled: e.target.checked })}
            />
            {t("enabled")}
          </label>
          <div className="b2b-feature-grid">
            {(Object.keys(icons) as (keyof typeof icons)[]).map((key) => (
              <label className="b2b-feature-card" key={key}>
                <Icon name={icons[key]} />
                <span>
                  <strong>{t(key)}</strong>
                  <small>{t(`${key}Hint`)}</small>
                </span>
                <input
                  type="checkbox"
                  checked={features[key]}
                  onChange={(e) => change({ [key]: e.target.checked })}
                />
              </label>
            ))}
          </div>
          {state.error && <p role="alert">{state.error}</p>}
          <p>{t("budgetsHint")}</p>
          <SettingsSaveBar
            dirty={state.dirty}
            busy={state.busy}
            saved={state.saved}
            canWrite={canWrite}
          />
        </fieldset>
      </form>
      <EntityHistory
        request={request}
        entity="settings"
        id="default"
        revision={state.value.revision}
        dirty={state.dirty || state.busy}
        onRestored={state.reload}
      />
    </section>
  );
}
