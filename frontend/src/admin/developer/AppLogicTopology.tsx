/** The existing Flow Builder topology displays the bounded UI AST; no separate flow is persisted or executed. */
import FlowTopology from "../automation/FlowTopology";
import type { FlowNode, Pipeline } from "../automation/pipeline-types";
import type { Statement } from "../../shared/apps/native/types";
import { useAppWorkspaceText } from "../../shared/i18n/app-workspace-i18n";
export function logicTopology(
  steps: Statement[],
  label: (s: Statement) => string,
) {
  const nodes: FlowNode[] = [],
    labels: Record<string, string> = {};
  function chain(
    items: Statement[],
    prefix: string,
    after: string | null,
  ): string | null {
    let next = after;
    for (let i = items.length - 1; i >= 0; i--) {
      const s = items[i],
        id = `${prefix}-${i}`;
      labels[id] = label(s);
      if (s.op === "if")
        nodes.unshift({
          id,
          kind: "condition",
          condition: { type: "alwaysValid" },
          on_true: chain(s.then, `${id}-yes`, next),
          on_false: chain(s.otherwise ?? [], `${id}-no`, next),
        });
      else
        nodes.unshift({ id, kind: "action", action: s.op, config: {}, next });
      next = id;
    }
    return next;
  }
  const entry = chain(steps, "ui", null) ?? "";
  return { value: { entry, nodes } as Pipeline, labels };
}
export default function AppLogicTopology({ steps }: { steps: Statement[] }) {
  const w = useAppWorkspaceText(),
    graph = logicTopology(steps, (s) => w(s.op));
  if (!steps.length) return null;
  return (
    <FlowTopology
      {...graph}
      onSelect={(id) => {
        const index = Number(id.split("-")[1]);
        document
          .getElementById(`app-instruction-0-${index}`)
          ?.scrollIntoView({ block: "center" });
      }}
    />
  );
}
