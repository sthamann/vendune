/** Saved native run progress and explicit continuation share the conversation's permission-scoped request owner. */
import { useState } from "react";
import { useAgentRunText } from "../../shared/i18n/agent-runs-i18n";
import Icon from "../../shared/ui/Icon";
import type { SavedRun } from "./useChatTurns";
export default function AgentRunCard({
  value,
  control,
}: {
  value: SavedRun;
  control: (action: "resume" | "cancel") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const act = async (action: "resume" | "cancel") => {
    setBusy(true);
    try {
      await control(action);
    } finally {
      setBusy(false);
    }
  };
  const text = useAgentRunText();
  return (
    <aside className="agent-run-card" aria-live="polite">
      <div>
        <Icon name={value.state === "ready" ? "check" : "spark"} size={18} />
        <strong>{text(value.state)}</strong>
      </div>
      <p>{text("hint")}</p>
      <small>
        {text("steps").replace(
          "{count}",
          String(value.completedModelSteps ?? 0),
        )}
      </small>
      {value.error && (
        <p role="alert">
          {text(
            value.error.code === "agent_authority_changed"
              ? "authority"
              : value.error.code === "agent_capacity_busy"
                ? "capacity"
                : "failed",
          )}
        </p>
      )}
      {value.state === "uncertain" && <p>{text("ambiguous")}</p>}
      <div className="agent-run-actions">
        {(value.state === "failed" || value.state === "uncertain") && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void act("resume")}
          >
            {text("resume")}
          </button>
        )}
        {value.state !== "ready" && value.state !== "cancelled" && (
          <button disabled={busy} onClick={() => void act("cancel")}>
            {text("cancel")}
          </button>
        )}
      </div>
    </aside>
  );
}
