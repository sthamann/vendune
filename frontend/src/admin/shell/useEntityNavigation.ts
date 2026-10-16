/** Linked entity navigation keeps native editors, browser deep links and back paths in the same tenant scope. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Tab } from "./navigation";
export type EntityTarget = {
  tab: "customers" | "orders" | "productData";
  id: string;
};
export type OpenEntity = (
  tab: EntityTarget["tab"],
  id: string,
  destinationScope?: string,
) => void;
export function useEntityNavigation(scope: string, allowed: Tab[]) {
  const initial = () => {
    const q = new URLSearchParams(location.search),
      tab = q.get("studio") as Tab;
    const valid = allowed.includes(tab)
      ? tab
      : allowed.includes("workspace")
        ? "workspace"
        : "assistant";
    return {
      tab: valid,
      id: ["customers", "orders", "productData"].includes(valid)
        ? (q.get("entity") ?? "")
        : "",
    };
  };
  const [tab, setTab] = useState<Tab>(() => initial().tab);
  const [entityTarget, setEntityTarget] = useState<EntityTarget | undefined>(
    () => {
      const v = initial();
      return v.id ? { tab: v.tab as EntityTarget["tab"], id: v.id } : undefined;
    },
  );
  const pending = useRef<{ scope: string; target: EntityTarget } | undefined>(
    undefined,
  );
  const stack = useRef<{ tab: Tab; target?: EntityTarget }[]>([]),
    previousScope = useRef(scope);
  const update = useCallback(
    (next: Tab, target?: EntityTarget, replace = false) => {
      setTab(next);
      setEntityTarget(target);
      const url = new URL(location.href);
      url.searchParams.set("studio", next);
      if (target) url.searchParams.set("entity", target.id);
      else url.searchParams.delete("entity");
      history[replace ? "replaceState" : "pushState"](null, "", url);
    },
    [],
  );
  const selectTab = (next: Tab) => {
    stack.current = [];
    update(next);
  };
  const openEntity: OpenEntity = (next, id, destinationScope = scope) => {
    if (destinationScope !== scope) {
      pending.current = { scope: destinationScope, target: { tab: next, id } };
      stack.current = [];
      update(next);
      return;
    }
    pending.current = undefined;
    stack.current.push({ tab, target: entityTarget });
    update(next, { tab: next, id });
  };
  const entityBack = () => {
    const prior = stack.current.pop();
    update(prior?.tab ?? tab, prior?.target);
  };
  useEffect(() => {
    if (previousScope.current !== scope) {
      previousScope.current = scope;
      stack.current = [];
      const target =
        pending.current?.scope === scope ? pending.current.target : undefined;
      pending.current = undefined;
      update(
        target && allowed.includes(target.tab) ? target.tab : tab,
        target && allowed.includes(target.tab) ? target : undefined,
        true,
      );
    }
  }, [scope, tab, update]);
  useEffect(() => {
    const pop = () => {
      const v = initial();
      setTab(v.tab);
      setEntityTarget(
        v.id ? { tab: v.tab as EntityTarget["tab"], id: v.id } : undefined,
      );
      stack.current = [];
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  return { tab, setTab, selectTab, entityTarget, openEntity, entityBack };
}
