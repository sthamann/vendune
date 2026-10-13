/** Team permissions and MCP visibility are independent from public storefront reads and AI grounding. */
import { permissionScopes } from "../team/permission-i18n";
import { usePermissionText } from "../team/permission-i18n";
import { useAssistantText } from "../../shared/i18n/app-assistant-i18n";
import type { Manifest } from "../../shared/apps/native/types";
import Icon from "../../shared/ui/Icon";
// Matches the native permission registry; the editor regression detects drift.
export const appScopes = permissionScopes;
export default function AppActionAccess({
  manifest,
  onChange,
}: {
  manifest: Manifest;
  onChange: (m: Manifest) => void;
}) {
  const { t } = useAssistantText();
  const pt = usePermissionText();
  return (
    <section className="app-model-card">
      <header>
        <Icon name="lock" />
        <h2>{t("access")}</h2>
      </header>
      <p>{t("mcpHint")}</p>
      {manifest.actions?.map((action) => (
        <div className="app-access-row" key={action.name}>
          <code>{action.name}</code>
          <label>
            {t("permission")}
            <select
              value={action.permission ?? ""}
              disabled={action.public}
              onChange={(e) =>
                onChange({
                  ...manifest,
                  actions: manifest.actions?.map((a) =>
                    a.name === action.name
                      ? { ...a, permission: e.target.value || undefined }
                      : a,
                  ),
                })
              }
            >
              <option value="">
                {action.public ? t("storefrontAccess") : t("legacyPermission")}
              </option>
              {appScopes.map((s) => (
                <option value={s} key={s}>
                  {pt(s)} ({s})
                </option>
              ))}
            </select>
          </label>
          <label className="app-check">
            <input
              type="checkbox"
              checked={action.mcp !== false}
              onChange={(e) =>
                onChange({
                  ...manifest,
                  actions: manifest.actions?.map((a) =>
                    a.name === action.name
                      ? { ...a, mcp: e.target.checked }
                      : a,
                  ),
                })
              }
            />
            {t("mcpAccess")}
          </label>
        </div>
      ))}
    </section>
  );
}
