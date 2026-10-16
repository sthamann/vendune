/** Personal current-rights stop control; operational revisions cannot be published from a sandbox. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../shell/studio-types";
import ConfirmDialog from "../../../shared/ui/ConfirmDialog";
import { useAgentControlText } from "./agent-control-i18n";
type Control = {
  stopped: boolean;
  revision: number;
  liveShop: string;
  owner: RequestFn;
};
export default function AgentControls({ request }: { request: RequestFn }) {
  const t = useAgentControlText();
  const current = useRef(request);
  current.current = request;
  const [state, setState] = useState<Control | null>(null),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setState(null);
    setConfirm(false);
    setBusy(false);
    setError("");
    request("/api/auth/access")
      .then(async (access) => {
        if (
          !access.personalSession ||
          !access.permissions.includes("ai.manage")
        )
          return;
        const value = await request("/api/agent/control");
        if (active) setState({ ...value, owner: request });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request]);
  if (state?.owner !== request && !error) return null;
  return (
    <section className="studio-card api-key-panel">
      <h2>{t("title")}</h2>
      {state && (
        <>
          <strong>{t(state.stopped ? "stopped" : "running")}</strong>
          <p>{t("stopHint")}</p>
          <button
            className="studio-secondary"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            {t(state.stopped ? "resume" : "stop")}
          </button>
        </>
      )}
      {state && confirm && (
        <ConfirmDialog
          title={t(state.stopped ? "resume" : "stop")}
          confirmLabel={t(state.stopped ? "resume" : "stop")}
          disabled={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            setBusy(true);
            setError("");
            try {
              const next = await request(
                "/api/agent/control",
                {
                  stopped: !state.stopped,
                  revision: state.revision,
                  approve: true,
                },
                "POST",
              );
              if (current.current === request) {
                setState({ ...next, owner: request });
                setConfirm(false);
              }
            } catch (e) {
              if (current.current === request) setError((e as Error).message);
            } finally {
              if (current.current === request) setBusy(false);
            }
          }}
        >
          <p>{t(state.stopped ? "resumeHint" : "stopHint")}</p>
        </ConfirmDialog>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
