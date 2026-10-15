/** Goals reference the existing proposal owner; no parallel worker, executor or approval queue. */
import { useEffect, useState } from "react";
import { canOpenStudio } from "../shell/permissions";
import type { Tab } from "../shell/navigation";
import type { RequestFn } from "../shell/studio-types";
import type { Goal } from "./workspace-model";
import { useWorkspaceText } from "./workspace-i18n";
import Icon from "../../shared/ui/Icon";
import { prepareGoalFlow } from "../automation/goal-template";
import WorkspaceTask, {
  type WorkspaceTaskValue as Task,
} from "./WorkspaceTask";
export default function WorkspaceGoals({
  goals,
  onChange,
  onAgent,
  request,
  rights,
  onOpen,
}: {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
  onAgent: (title: string) => void;
  request: RequestFn;
  rights: string[];
  onOpen: (tab: Tab) => void;
}) {
  const t = useWorkspaceText(),
    [title, setTitle] = useState(""),
    [tasks, setTasks] = useState<Task[]>([]),
    [error, setError] = useState("");
  const allowed = canOpenStudio("assistant", rights);
  useEffect(() => {
    let active = true;
    setTasks([]);
    if (allowed)
      void request("/api/agent/tasks")
        .then((v) => {
          if (active) setTasks(v.tasks ?? []);
        })
        .catch(() => {
          if (active) setError(t("error"));
        });
    return () => {
      active = false;
    };
  }, [request, allowed]);
  const patch = (id: string, value: Partial<Goal>) =>
    onChange(goals.map((g) => (g.id === id ? { ...g, ...value } : g)));
  return (
    <section className="personal-goals studio-card">
      <h2>
        <Icon name="spark" />
        {t("goals")}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || goals.length >= 30) return;
          onChange([
            ...goals,
            {
              id: `goal_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
              title: title.trim(),
              status: "planned",
              taskId: null,
            },
          ]);
          setTitle("");
        }}
      >
        <label>
          {t("goal")}
          <input
            value={title}
            maxLength={1000}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("placeholder")}
          />
        </label>
        <button
          className="studio-secondary"
          disabled={!title.trim() || goals.length >= 30}
        >
          <Icon name="plus" />
          {t("addGoal")}
        </button>
      </form>
      <p>{t("agentHint")}</p>
      {goals.map((g) => (
        <article className="personal-goal" key={g.id}>
          <strong>{g.title}</strong>
          <label>
            {t("status")}
            <select
              value={g.status}
              onChange={(e) =>
                patch(g.id, { status: e.target.value as Goal["status"] })
              }
            >
              {(
                ["planned", "working", "review", "done", "stopped"] as const
              ).map((s) => (
                <option value={s} key={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
          {allowed && (
            <select
              aria-label={t("tasks")}
              value={g.taskId ?? ""}
              onChange={(e) => patch(g.id, { taskId: e.target.value || null })}
            >
              <option value="">{t("tasks")}</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.preview.proposal?.summary}
                </option>
              ))}
            </select>
          )}
          {rights.includes("automation.manage") && (
            <button
              onClick={() => {
                prepareGoalFlow(g.title);
                onOpen("automation");
              }}
            >
              {t("flow")} ↗
            </button>
          )}
          <button disabled={!allowed} onClick={() => onAgent(g.title)}>
            {t("plan")} ↗
          </button>
          <button
            aria-label={`${t("remove")}: ${g.title}`}
            onClick={() => onChange(goals.filter((a) => a.id !== g.id))}
          >
            ×
          </button>
        </article>
      ))}
      {error && <p role="alert">{error}</p>}
      {allowed && (
        <details>
          <summary>
            {t("tasks")} · {tasks.length}
          </summary>
          {tasks.map((task) => (
            <WorkspaceTask key={task.id} task={task} request={request} />
          ))}
        </details>
      )}
      {canOpenStudio("automation", rights) && (
        <details>
          <summary>{t("flow")}</summary>
          <p>{t("flowHint")}</p>
          <button onClick={() => onOpen("automation")}>{t("flow")} ↗</button>
        </details>
      )}
    </section>
  );
}
