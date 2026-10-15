/** Installed settings use the existing encrypted secret owner; secret inputs are write-only and cleared after save. */
import "./app-settings.css";
import { useEffect, useState } from "react";
import type { Manifest } from "../../shared/apps/native/types";
import type { RequestFn } from "../shell/studio-types";
import { useAppSettingText } from "../../shared/i18n/app-settings-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
type State = {
  fields: NonNullable<Manifest["settings"]>;
  values: Record<string, string | number | boolean | null>;
  configured: string[];
  revision: number;
  digest: string;
  current: boolean;
  canManage: boolean;
  encryptionReady: boolean;
};
export default function AppSettings({
  app,
  request,
  mainLocale,
}: {
  app: string;
  request: RequestFn;
  mainLocale: string;
}) {
  const t = useAppSettingText(),
    { locale } = useLocale(),
    [state, setState] = useState<State | null>(null),
    [values, setValues] = useState<State["values"]>({}),
    [approve, setApprove] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const load = async () => {
    const next = await request(`/api/apps/${encodeURIComponent(app)}/settings`);
    setState(next);
    setValues(next.values);
    setApprove(false);
  };
  useEffect(() => {
    let active = true;
    setState(null);
    setValues({});
    setError("");
    request(`/api/apps/${encodeURIComponent(app)}/settings`)
      .then((next) => {
        if (active) {
          setState(next);
          setValues(next.values);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [app, request]);
  return (
    <section className="app-installed-settings">
      <h2>{t("settings")}</h2>
      <p>{t("hint")}</p>
      <p>{t("runtime")}</p>
      {state && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setSaved(false);
            try {
              await request(
                `/api/apps/${encodeURIComponent(app)}/settings`,
                {
                  revision: state.revision,
                  digest: state.digest,
                  approve,
                  values,
                },
                "PUT",
              );
              setValues({});
              await load();
              setSaved(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset
            disabled={busy || !state.canManage || !state.encryptionReady}
          >
            {!state.current && <p role="status">{t("stale")}</p>}
            <div className="app-settings-values">
              {state.fields.map((f) => (
                <label key={f.key}>
                  {contentText(f.label, locale, mainLocale) || f.key}
                  {f.kind === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={values[f.key] === true}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.checked })
                      }
                    />
                  ) : (
                    <input
                      type={
                        f.kind === "secret"
                          ? "password"
                          : f.kind === "integer"
                            ? "number"
                            : "text"
                      }
                      autoComplete="off"
                      required={f.required && !state.configured.includes(f.key)}
                      placeholder={
                        f.kind === "secret" && state.configured.includes(f.key)
                          ? t("configured")
                          : undefined
                      }
                      value={String(values[f.key] ?? "")}
                      maxLength={4096}
                      onChange={(e) => {
                        const next = { ...values };
                        if (f.kind === "secret" && !e.target.value)
                          delete next[f.key];
                        else
                          next[f.key] =
                            f.kind === "integer"
                              ? Number(e.target.value)
                              : e.target.value;
                        setValues(next);
                      }}
                    />
                  )}
                </label>
              ))}
            </div>
            <label className="app-check">
              <input
                type="checkbox"
                checked={approve}
                onChange={(e) => setApprove(e.target.checked)}
              />
              {t("approve")}
            </label>
            <button className="studio-primary" disabled={!approve}>
              {t("save")}
            </button>
          </fieldset>
        </form>
      )}
      {saved && <p role="status">{t("saved")}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
