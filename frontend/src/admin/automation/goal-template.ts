/** Explicit personal goal handoff into an inactive native Flow draft; no URL, persistence or new scheduler. */
import { useEffect, useRef } from "react";
import type { Kind } from "./automation-types";
let pending: { text: string; expires: number } | undefined;
export function prepareGoalFlow(text: string) {
  pending = { text: text.slice(0, 1000), expires: Date.now() + 30000 };
}
export function clearGoalFlow() {
  pending = undefined;
}
export function goalTemplate(locale: string) {
  const goal = pending && pending.expires > Date.now() ? pending.text : null;
  pending = undefined;
  if (!goal) return null;
  return {
    name: { [locale]: goal.slice(0, 100) },
    active: false,
    event: "order.placed",
    condition: { type: "alwaysValid" },
    action: "ai_proposal",
    instruction: { [locale]: goal },
    locale,
  };
}

export function useGoalTemplate(
  languages: { mainLocale: string } | null,
  setKind: (kind: Kind) => void,
  setId: (id: string) => void,
  setRevision: (revision: number) => void,
  setData: (data: Record<string, unknown>) => void,
  setLanguage: (language: string) => void,
) {
  const applied = useRef(false);
  useEffect(() => {
    if (!languages) return;
    const goal = goalTemplate(languages.mainLocale);
    if (!goal) return;
    applied.current = true;
    setKind("flows");
    setId("");
    setRevision(0);
    setData(goal);
    setLanguage(languages.mainLocale);
  }, [languages]);
  return applied;
}
