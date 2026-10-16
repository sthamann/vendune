/** Personal, expiring, least-privilege integration keys; plaintext stays in component memory and is never reloaded. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../shell/studio-types";
import PermissionPicker from "../../team/PermissionPicker";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import { usePermissionText } from "../../team/permission-i18n";
import { useApiText } from "./api-i18n";
import AgentBudgetFields, {
  agentBudget,
  planningScope,
  type BudgetFields,
} from "./AgentBudgetFields";
import { useAgentControlText } from "./agent-control-i18n";
import { useLocale } from "../../../shared/i18n/i18n";
type Key = {
  id: string;
  name: string;
  permissions: string[];
  expiresAt: string | null;
  agentBudget?: ReturnType<typeof agentBudget>;
  agentUsage?: { tokensAllocated: number; costMicrosAllocated: number };
};
export default function IntegrationKeys({ request }: { request: RequestFn }) {
  const t = useApiText();
  const at = useAgentControlText();
  const { locale } = useLocale();
  const usd = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 6,
    }).format(n / 1_000_000);
  const current = useRef(request);
  current.current = request;
  const secretOwner = useRef<RequestFn | null>(null),
    keyOwner = useRef<RequestFn | null>(null);
  const [purpose, setPurpose] = useState("api"),
    [budgetFields, setBudgetFields] = useState<BudgetFields>({
      provider: "",
      model: "",
      tokens: "",
      cost: "",
      tariff: "",
    });
  const budget = agentBudget(budgetFields);
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
  const load = async () => {
    const result = await request("/api/workspace/integrations");
    if (current.current === request) {
      keyOwner.current = request;
      setKeys(result.elements);
    }
  };
  useEffect(() => {
    let active = true;
    setKeys([]);
    setSecret("");
    setAccess([]);
    setScopes([]);
    setPersonal(false);
    setBusy(false);
    setRevoke(null);
    setError("");
    request("/api/auth/access")
      .then(async (v) => {
        if (!active) return;
        setAccess(v.permissions);
        setPersonal(v.personalSession === true);
        if (v.permissions.includes("team.manage")) {
          const result = await request("/api/workspace/integrations");
          if (active) {
            keyOwner.current = request;
            setKeys(result.elements);
          }
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
                ...(purpose === "agent" ? { agentBudget: budget } : {}),
              },
              "POST",
            );
            if (current.current !== request) return;
            secretOwner.current = request;
            setSecret(result.key);
            setCopied(false);
            setName("");
            setScopes([]);
            await load();
          } catch (e) {
            if (current.current === request) setError((e as Error).message);
          } finally {
            if (current.current === request) setBusy(false);
          }
        }}
      >
        <fieldset disabled={!manage || busy}>
          <div className="api-key-fields">
            <label>
              {at("kind")}
              <select
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  if (e.target.value === "agent")
                    setScopes(scopes.filter(planningScope));
                }}
              >
                <option value="api">{at("api")}</option>
                {personal && <option value="agent">{at("agent")}</option>}
              </select>
            </label>
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
          {purpose === "agent" && (
            <AgentBudgetFields
              value={budgetFields}
              onChange={setBudgetFields}
            />
          )}
          <h3>{t("rights")}</h3>
          <PermissionPicker
            available={access.filter(
              (p) => p !== "*" && (purpose !== "agent" || planningScope(p)),
            )}
            value={scopes}
            onChange={setScopes}
          />
          <button
            className="studio-primary"
            disabled={
              !name.trim() ||
              !scopes.length ||
              (purpose === "agent" && (!personal || !budget)) ||
              (!permanent && (!Number.isInteger(days) || days < 1 || days > 90))
            }
          >
            {t("create")}
          </button>
        </fieldset>
      </form>
      {secret && secretOwner.current === request && (
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
      {(keyOwner.current === request ? keys : []).map((key) => (
        <article className="api-key-row" key={key.id}>
          <div>
            <strong>{key.name}</strong>
            {key.agentBudget && (
              <p>
                {at("agent")} · {key.agentBudget.model} · {at("allocated")}:{" "}
                {key.agentUsage?.tokensAllocated ?? 0} /{" "}
                {key.agentBudget.tokens} ·{" "}
                {usd(key.agentUsage?.costMicrosAllocated ?? 0)} /{" "}
                {usd(key.agentBudget.costMicros)}
              </p>
            )}
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
              if (current.current !== request) return;
              setRevoke(null);
              await load();
            } catch (e) {
              if (current.current === request) setError((e as Error).message);
            } finally {
              if (current.current === request) setBusy(false);
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
