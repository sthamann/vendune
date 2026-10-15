/** Personal goals open the native proposal review and apply owner; no second approval/execution path. */
import { useState } from "react";
import ProposalCard from "../assistant/ProposalCard";
import type { Preview, RequestFn } from "../shell/studio-types";
import { useWorkspaceText } from "./workspace-i18n";
export type WorkspaceTaskValue = {
  id: string;
  preview: Preview;
  applied: boolean;
};
export default function WorkspaceTask({
  task,
  request,
}: {
  task: WorkspaceTaskValue;
  request: RequestFn;
}) {
  const t = useWorkspaceText(),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [applied, setApplied] = useState(task.applied),
    [error, setError] = useState("");
  return (
    <article className="personal-task">
      <strong>{task.preview.proposal?.summary}</strong>
      <span>{t(applied ? "done" : "review")}</span>
      <button onClick={() => setOpen(!open)}>{t("open")}</button>
      {open && (
        <div className="personal-task-review">
          <ProposalCard
            message={{
              id: 0,
              role: "assistant",
              content: task.preview.proposal.summary,
              applied,
              data: {
                taskId: task.id,
                preview: {
                  ...task.preview,
                  catalogBefore: task.preview.catalogBefore ?? [],
                },
              },
            }}
            busy={busy}
            canApply={!applied}
            onApply={async () => {
              setBusy(true);
              setError("");
              try {
                await request(
                  `/api/agent/tasks/${encodeURIComponent(task.id)}/apply`,
                  { approve: true },
                );
                setApplied(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
          <details>
            <summary>{t("sources")}</summary>
            <pre>{JSON.stringify(task.preview, null, 2)}</pre>
          </details>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </article>
  );
}
