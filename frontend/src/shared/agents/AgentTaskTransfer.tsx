/** Explicit coding-agent task download/copy and domain-validated result import; no tokens or background execution. */
import { useState } from "react";
import Icon from "../ui/Icon";
import { useAgentText } from "./agent-i18n";
export function downloadAgentTask(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function AgentTaskTransfer({
  task,
  name,
  onImport,
  busy,
  disabled = false,
}: {
  task: unknown;
  name: string;
  onImport: (value: unknown) => Promise<void>;
  busy: boolean;
  disabled?: boolean;
}) {
  const t = useAgentText(),
    [json, setJson] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  if (!task) return null;
  return (
    <section className="agent-transfer">
      <h3>{t("task")}</h3>
      <div className="agent-transfer-actions">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                JSON.stringify(task, null, 2),
              );
              setCopied(true);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Icon name="copy" size={15} />
          {t(copied ? "copied" : "copy")}
        </button>
        <button type="button" onClick={() => downloadAgentTask(name, task)}>
          {t("download")}
        </button>
      </div>
      <details>
        <summary>{t("task")}</summary>
        <pre>{JSON.stringify(task, null, 2)}</pre>
      </details>
      <label>
        {t("result")}
        <textarea
          aria-label={t("result")}
          rows={5}
          value={json}
          maxLength={100000}
          onChange={(event) => setJson(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="studio-secondary"
        disabled={disabled || busy || !json.trim()}
        onClick={async () => {
          setError("");
          try {
            await onImport(JSON.parse(json));
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        {t("review")}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
