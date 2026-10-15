/** Personal, expiring, least-privilege integration keys; plaintext stays in component memory and is never reloaded. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shell/studio-types";
import PermissionPicker from "../../team/PermissionPicker";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import { usePermissionText } from "../../team/permission-i18n";
import { useApiText } from "./api-i18n";
type Key = {
  id: string;
  name: string;
  permissions: string[];
  expiresAt: string | null;
};
export default function IntegrationKeys({ request }: { request: RequestFn }) {
  const t = useApiText();
  const pt = usePermissionText();
  const [keys, setKeys] = useState<Key[]>([]),
    [access, setAccess] = useState<string[]>([]),
    [name, setName] = useState(""),
    [days, setDays] = useState(30),
    [permanent, setPermanent] = useState(false),
    [personal, setPersonal] = useState(false),
    [scopes, setScopes] = useState<string[]>([]),
    [secret, setSecret] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revoke, setRevoke] = useState<Key | null>(null),
    [copied, setCopied] = useState(false);
  const manage = access.includes("team.manage");
  const load = async () =>
    setKeys((await request("/api/workspace/integrations")).elements);
  useEffect(() => {
    let active = true;
    request("/api/auth/access")
      .then(async (v) => {
        if (!active) return;
        setAccess(v.permissions);
        setPersonal(v.personalSession === true);
        if (v.permissions.includes("team.manage")) {
          const result = await request("/api/workspace/integrations");
          if (active) setKeys(result.elements);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request]);
  return (
    <section className="studio-card api-key-panel">
      <h2>{t("keys")}</h2>
      <p>{t("manageHint")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setSecret("");
          try {
            const result = await request(
              "/api/workspace/integrations",
              {
                name: name.trim(),
                expiresInDays: days,
                permissions: scopes,
                ...(permanent ? { nonExpiring: true } : {}),
              },
              "POST",
            );
            setSecret(result.key);
            setCopied(false);
            setName("");
            setScopes([]);
            await load();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!manage || busy}>
          <div className="api-key-fields">
            <label>
              {t("name")}
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {t("lifetime")}
              <select
                value={permanent ? "permanent" : "limited"}
                onChange={(e) => setPermanent(e.target.value === "permanent")}
              >
                <option value="limited">{t("limited")}</option>
                {personal && (
                  <option value="permanent">{t("permanent")}</option>
                )}
              </select>
            </label>
            {!permanent && (
              <label>
                {t("days")}
                <input
                  required
                  type="number"
                  min={1}
                  max={90}
                  step={1}
                  value={Number.isFinite(days) ? days : ""}
                  onChange={(e) => setDays(e.target.valueAsNumber)}
                />
              </label>
            )}
          </div>
          {permanent && <p>{t("permanentHint")}</p>}
          <h3>{t("rights")}</h3>
          <PermissionPicker
            available={access.filter((p) => p !== "*")}
            value={scopes}
            onChange={setScopes}
          />
          <button
            className="studio-primary"
            disabled={
              !name.trim() ||
              !scopes.length ||
              (!permanent && (!Number.isInteger(days) || days < 1 || days > 90))
            }
          >
            {t("create")}
          </button>
        </fieldset>
      </form>
      {secret && (
        <div className="api-secret">
          <p>{t("once")}</p>
          <input
            readOnly
            type="password"
            aria-label={t("keys")}
            value={secret}
            autoComplete="off"
          />
          <button
            className="studio-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(secret);
                setCopied(true);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {t(copied ? "copied" : "copy")}
          </button>
          <button className="studio-secondary" onClick={() => setSecret("")}>
            {t("clear")}
          </button>
        </div>
      )}
      {keys.map((key) => (
        <article className="api-key-row" key={key.id}>
          <div>
            <strong>{key.name}</strong>
            <p>{key.permissions.map((p) => `${pt(p)} (${p})`).join(" · ")}</p>
            <small>
              {t("expiry")}:{" "}
              {key.expiresAt
                ? new Date(key.expiresAt).toLocaleString()
                : t("permanent")}
              {key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()
                ? ` · ${t("expired")}`
                : ""}
            </small>
          </div>
          <button
            className="studio-secondary"
            disabled={!manage || busy}
            onClick={() => setRevoke(key)}
          >
            {t("revoke")}
          </button>
        </article>
      ))}
      {revoke && (
        <ConfirmDialog
          title={t("revoke")}
          confirmLabel={t("revoke")}
          disabled={busy}
          onCancel={() => setRevoke(null)}
          onConfirm={async () => {
            setBusy(true);
            setError("");
            try {
              await request(
                `/api/workspace/integrations/${encodeURIComponent(revoke.id)}`,
                undefined,
                "DELETE",
              );
              setRevoke(null);
              await load();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <strong>{revoke.name}</strong>
          <p>{t("revokeHint")}</p>
        </ConfirmDialog>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
