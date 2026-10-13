/** Tenant role editor uses the canonical roles API, shared translation editor, audit and dependency confirmation. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../shared/i18n/ContentLanguagePicker";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import { usePermissionText } from "./permission-i18n";
import PermissionPicker from "./PermissionPicker";
import Icon from "../../shared/ui/Icon";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import EntityHistory from "../../shared/history/EntityHistory";
import "../styles/team-roles.css";
export type WorkspaceRole = {
  id: string;
  revision: number;
  builtin: boolean;
  data: {
    name: Record<string, string>;
    permissions: string[];
    active: boolean;
  };
};
export default function RolesManager({
  request,
  onChanged,
}: {
  request: RequestFn;
  onChanged?: () => void;
}) {
  const t = usePermissionText(),
    { locale } = useLocale();
  const [roles, setRoles] = useState<WorkspaceRole[]>([]),
    [selected, setSelected] = useState<WorkspaceRole>(),
    [available, setAvailable] = useState<string[]>([]),
    [granted, setGranted] = useState<string[]>([]),
    [language, setLanguage] = useState(""),
    [locales, setLocales] = useState<string[]>([]),
    [main, setMain] = useState("en-GB"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [baseline, setBaseline] = useState(""),
    [confirm, setConfirm] = useState(false),
    [usage, setUsage] = useState<{
      members: number;
      invitations: number;
      blocked: boolean;
    }>();
  const load = async () => {
    const [r, a] = await Promise.all([
      request("/api/workspace/roles"),
      request("/api/auth/access"),
    ]);
    setRoles(r.elements);
    setAvailable(a.available);
    setGranted(a.permissions);
    setMain(r.mainLocale);
    setLocales(r.locales);
  };
  useEffect(() => {
    let active = true;
    void load().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [request]);
  const dirty = !!selected && JSON.stringify(selected.data) !== baseline;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const open = (r: WorkspaceRole) => {
    setSelected(r);
    setBaseline(JSON.stringify(r.data));
    setLanguage(main);
    setError("");
  };
  const patch = (v: Partial<WorkspaceRole["data"]>) =>
    selected && setSelected({ ...selected, data: { ...selected.data, ...v } });
  return (
    <section className="studio-card roles-manager">
      <header className="roles-header">
        <div>
          <h2>{t("roles")}</h2>
          <p>{t("roleHint")}</p>
        </div>
        <button
          className="studio-primary"
          disabled={busy}
          onClick={() =>
            open({
              id: `role_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
              revision: 0,
              builtin: false,
              data: { name: {}, permissions: [], active: true },
            })
          }
        >
          <Icon name="plus" />
          {t("newRole")}
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {!selected ? (
        <div className="role-cards">
          {roles.map((r) => (
            <button className="role-card" key={r.id} onClick={() => open(r)}>
              <Icon name="lock" />
              <strong>{contentText(r.data.name, locale, main) || r.id}</strong>
              <small>
                {t(r.builtin ? "standard" : "custom")} ·{" "}
                {r.id === "owner"
                  ? available.length
                  : r.data.permissions.length}{" "}
                · {t(r.data.active ? "active" : "paused")}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <ContentLanguage
          locales={locales}
          mainLocale={main}
          language={language}
          onLanguageChange={setLanguage}
        >
          <nav className="workbench-row">
            <button
              className="studio-secondary"
              onClick={() => {
                if (dirty) setConfirm(true);
                else setSelected(undefined);
              }}
            >
              {t("back")}
            </button>
            <ContentLanguagePicker />
          </nav>
          <p>{t("locked")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const v = await request(
                  `/api/workspace/roles/${selected.id}`,
                  { revision: selected.revision, data: selected.data },
                  "PUT",
                );
                setSelected({ ...selected, revision: v.revision });
                setBaseline(JSON.stringify(selected.data));
                await load();
              });
            }}
          >
            <fieldset disabled={busy || selected.id === "owner"}>
              <LocalizedField
                label={t("name")}
                value={selected.data.name}
                required
                maxLength={100}
                onChange={(name) =>
                  patch({ name: name as Record<string, string> })
                }
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selected.data.active}
                  onChange={(e) => patch({ active: e.target.checked })}
                />
                {t("active")}
              </label>
              <PermissionPicker
                available={available}
                granted={granted}
                value={selected.data.permissions}
                onChange={(permissions) => patch({ permissions })}
              />
              <button className="studio-primary" disabled={!dirty}>
                {t("save")}
              </button>
              {!selected.builtin && selected.revision > 0 && (
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() =>
                    void run(async () => {
                      setUsage(
                        await request(
                          `/api/workspace/roles/${selected.id}/dependencies`,
                        ),
                      );
                    })
                  }
                >
                  {t("delete")}
                </button>
              )}
            </fieldset>
          </form>
          {selected.revision > 0 && (
            <EntityHistory
              request={request}
              entity="role"
              id={selected.id}
              revision={selected.revision}
              dirty={dirty || busy}
              onRestored={async () => {
                const r = await request("/api/workspace/roles");
                setRoles(r.elements);
                open(
                  r.elements.find((v: WorkspaceRole) => v.id === selected.id),
                );
              }}
            />
          )}
          {usage && (
            <ConfirmDialog
              title={t("delete")}
              confirmLabel={t("delete")}
              disabled={busy || usage.blocked}
              onCancel={() => setUsage(undefined)}
              onConfirm={() =>
                void run(async () => {
                  await request(
                    `/api/workspace/roles/${selected.id}`,
                    { revision: selected.revision, approve: true },
                    "DELETE",
                  );
                  setUsage(undefined);
                  setSelected(undefined);
                  await load();
                })
              }
            >
              <p>{t("deleteHint")}</p>
              <p>
                {t("members")}: {usage.members} · {t("invitations")}:{" "}
                {usage.invitations}
              </p>
            </ConfirmDialog>
          )}
          {confirm && (
            <ConfirmDialog
              title={t("back")}
              confirmLabel={t("back")}
              onCancel={() => setConfirm(false)}
              onConfirm={() => {
                setSelected(undefined);
                setConfirm(false);
              }}
            >
              <p>{t("cancel")}</p>
            </ConfirmDialog>
          )}
        </ContentLanguage>
      )}
    </section>
  );
}
