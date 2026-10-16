/** Read-only model planning over domain-owned criteria; explicit review precedes any list query. */
import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import { useGridText } from "./grid-i18n";
import type { GridCriteria, GridProps } from "./types";
export default function GridAgent({
  agent,
  labels,
  values,
  onApply,
  formatValue,
}: {
  agent: NonNullable<GridProps<unknown>["agent"]>;
  labels: Record<string, string>;
  values?: Record<string, Record<string, string>>;
  onApply: (criteria: GridCriteria) => void;
  formatValue?: (key: string, value: string | boolean) => string | undefined;
}) {
  const { g, locale } = useGridText();
  const [open, setOpen] = useState(false),
    [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [plan, setPlan] = useState<GridCriteria | null>(null);
  const generation = useRef(0);
  const host = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      generation.current++;
    },
    [agent.request, agent.entity],
  );
  const close = () => {
    generation.current++;
    setOpen(false);
    setBusy(false);
    setPlan(null);
    setError("");
  };
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (host.current && !host.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  if (!agent.enabled) return null;
  return (
    <div ref={host} className="agent-grid-assistant">
      <button
        type="button"
        className="agent-grid-ask"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name="spark" />
        {g("agent")}
      </button>
      {open && (
        <div
          className="agent-grid-agent-panel"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
        >
          <div className="agent-grid-popover-heading">
            <strong>{g("agent")}</strong>
            <button type="button" aria-label={g("cancel")} onClick={close}>
              <Icon name="close" />
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const current = ++generation.current;
              setBusy(true);
              setError("");
              setPlan(null);
              try {
                const result = await agent.request("/api/merchant/grid/plan", {
                  entity: agent.entity,
                  instruction: prompt.trim(),
                  locale,
                });
                if (generation.current !== current) return;
                const fields = result.criteria;
                if (
                  result.supported !== true ||
                  !fields ||
                  typeof fields !== "object" ||
                  Object.entries(fields).some(
                    ([k, v]) =>
                      !labels[k] || !["string", "boolean"].includes(typeof v),
                  )
                ) {
                  setError(g("unsupported"));
                  return;
                }
                setPlan(fields);
              } catch {
                if (generation.current === current) setError(g("agentFailure"));
              } finally {
                if (generation.current === current) setBusy(false);
              }
            }}
          >
            <label>
              {g("prompt")}
              <input
                maxLength={2000}
                value={prompt}
                onChange={(e) => {
                  generation.current++;
                  setBusy(false);
                  setPrompt(e.target.value);
                  setPlan(null);
                }}
                placeholder={g(
                  agent.entity === "orders"
                    ? "exampleOrders"
                    : agent.entity === "products"
                      ? "exampleProducts"
                      : "exampleCustomers",
                )}
              />
            </label>
            <button
              type="submit"
              className="studio-primary"
              disabled={busy || !prompt.trim()}
            >
              <Icon name="spark" />
              {g(busy ? "planning" : "plan")}
            </button>
          </form>
          <p className="muted">{g("agentHint")}</p>
          {error && <p role="alert">{error}</p>}
          {plan && (
            <div className="agent-grid-plan">
              <strong>{g("review")}</strong>
              <div className="agent-grid-chips">
                {Object.entries(plan).map(([k, v]) => (
                  <span key={k}>
                    {labels[k]}{" "}
                    <b>
                      {formatValue?.(k, v) ??
                        values?.[k]?.[String(v)] ??
                        String(v)}
                    </b>
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="studio-primary"
                onClick={() => {
                  onApply(plan);
                  close();
                }}
              >
                {g("apply")}
              </button>
              <button
                type="button"
                className="studio-secondary"
                onClick={close}
              >
                {g("cancel")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
