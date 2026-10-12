/** Native app workspace: OAuth, provider settings, durable jobs and private sources. */
import { useEffect, useState } from "react";
import { useConnectedText } from "../../shared/i18n/connected-i18n";
import type { RequestFn } from "../shell/studio-types";
import { connectorDescriptors } from "./connector-descriptors";
export default function ConnectorPanel({
  app,
  request,
  manage,
}: {
  app: string;
  request: RequestFn;
  manage: boolean;
}) {
  const { x } = useConnectedText();
  const contract = connectorDescriptors[app];
  const [status, setStatus] = useState<any>();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const call = (name: string, value: unknown = {}) =>
    request(`/api/apps/${app}/actions/${name}`, value);
  const refresh = async () => {
    const v = await call("status");
    setStatus(v);
    if (!dirty) setSettings(v.settings);
    if (contract.sources) {
      const s = await request("/api/knowledge/external");
      setSources(s.elements.filter((r: any) => r.app === app));
    }
  };
  useEffect(() => {
    let active = true;
    Promise.all([
      call("status"),
      contract.sources
        ? request("/api/knowledge/external")
        : Promise.resolve({ elements: [] }),
    ])
      .then(([v, evidence]) => {
        if (active) {
          setStatus(v);
          setSettings(v.settings);
          setSources(evidence.elements.filter((r: any) => r.app === app));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [app, request]);
  useEffect(() => {
    if (!status?.jobs.some((j: any) => ["queued", "running"].includes(j.state)))
      return;
    const timer = setInterval(
      () => void refresh().catch((e) => setError(e.message)),
      1500,
    );
    return () => clearInterval(timer);
  }, [status, app, dirty]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const field = (key: string, label: string, placeholder = "") => (
    <label>
      {x(label)}
      <input
        value={settings[key] ?? ""}
        placeholder={placeholder}
        disabled={!manage || busy}
        onChange={(e) => {
          setDirty(true);
          setSettings((s) => ({ ...s, [key]: e.target.value }));
        }}
      />
    </label>
  );
  return (
    <div className="connector-panel">
      <header>
        <div>
          <span className="kicker">{x("connection")}</span>
          <h3>{x(status?.connected ? "connected" : "disconnected")}</h3>
        </div>
        <button
          type="button"
          className="studio-secondary"
          disabled={busy}
          onClick={() => void run(refresh)}
        >
          {x("refresh")}
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {status && !status.oauthClientConfigured && <p>{x("setup")}</p>}
      <p>{x(contract.hint)}</p>
      <div className="workbench-row">
        <button
          type="button"
          className="studio-primary"
          disabled={!manage || busy || !status?.oauthClientConfigured}
          onClick={() => {
            const popup = window.open("about:blank", "_blank");
            if (popup) popup.opener = null;
            void run(async () => {
              try {
                const v = await call("connect");
                if (popup) popup.location.href = v.authorizationUrl;
              } catch (e) {
                popup?.close();
                throw e;
              }
            });
          }}
        >
          {x("connect")}
        </button>
        {status?.connected && (
          <button
            type="button"
            className="studio-secondary"
            disabled={!manage || busy}
            onClick={() => void run(() => call("disconnect"))}
          >
            {x("disconnect")}
          </button>
        )}
      </div>
      <div className="connector-settings">
        {contract.fields.map((f) => (
          <span key={f.key}>{field(f.key, f.label, f.placeholder)}</span>
        ))}
        {contract.toggle && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              disabled={!manage || busy}
              checked={settings[contract.toggle.key] ?? false}
              onChange={(e) => {
                setDirty(true);
                setSettings((s) => ({
                  ...s,
                  [contract.toggle!.key]: e.target.checked,
                }));
              }}
            />
            {x(contract.toggle.label)}
          </label>
        )}
        {contract.choices && status?.connected && (
          <>
            <button
              type="button"
              className="studio-secondary"
              disabled={!manage || busy}
              onClick={() =>
                void run(async () => {
                  const v = await call(contract.choices!.action);
                  setChoices(v.channels ?? v.labels ?? []);
                })
              }
            >
              {x("choose")}
            </button>
            {choices.length > 0 && (
              <select
                aria-label={x(contract.choices.label)}
                value={settings[contract.choices.key] ?? ""}
                onChange={(e) => {
                  setDirty(true);
                  setSettings((s) => ({
                    ...s,
                    [contract.choices!.key]: e.target.value,
                  }));
                }}
              >
                <option value="">—</option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        <button
          type="button"
          className="studio-primary"
          disabled={!manage || busy || !status}
          onClick={() =>
            void run(async () => {
              const v = await call("configure", {
                revision: status.revision,
                settings,
              });
              setStatus(v);
              setSettings(v.settings);
              setDirty(false);
            })
          }
        >
          {x("save")}
        </button>
        {contract.sync && (
          <button
            type="button"
            className="studio-secondary"
            disabled={!manage || busy || !status?.connected}
            onClick={() =>
              void run(() => call("sync", { requestKey: crypto.randomUUID() }))
            }
          >
            {x("sync")}
          </button>
        )}
      </div>
      {contract.sources && (
        <section>
          <h3>{x("private")}</h3>
          <p>{x("privacy")}</p>
          {!sources.length ? (
            <p>{x("empty")}</p>
          ) : (
            sources.map((s) => (
              <a
                className="search-hit"
                key={s.sourceId}
                href={s.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {s.title}
                <small>{s.sourceId}</small>
              </a>
            ))
          )}
        </section>
      )}
      <section>
        <h3>{x("jobs")}</h3>
        {status?.jobs.map((j: any) => (
          <div className="connector-job" key={j.id}>
            <strong>{x(j.state)}</strong>
            <small>{j.id}</small>
          </div>
        ))}
      </section>
    </div>
  );
}
