/** Bounded semantic review summaries compare the exact current and proposed manifests. */
import type { Manifest } from "../../shared/apps/native/types";
export type Difference = {
  group: "models" | "surfaces" | "workflows" | "access";
  kind: "added" | "changed" | "removed";
  id: string;
};
export function proposalChanges(
  before: Manifest,
  after: Manifest,
): Difference[] {
  const changes: Difference[] = [];
  function compare(
    group: Difference["group"],
    a: Record<string, unknown>,
    b: Record<string, unknown>,
  ) {
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)]))
      if (JSON.stringify(a[id]) !== JSON.stringify(b[id]))
        changes.push({
          group,
          id,
          kind: !(id in a) ? "added" : !(id in b) ? "removed" : "changed",
        });
  }
  compare(
    "models",
    Object.fromEntries(before.entities.map((e) => [e.name, e])),
    Object.fromEntries(after.entities.map((e) => [e.name, e])),
  );
  compare(
    "surfaces",
    Object.fromEntries((before.views ?? []).map((v) => [v.id, v])),
    Object.fromEntries((after.views ?? []).map((v) => [v.id, v])),
  );
  const access = (m: Manifest) => ({
    permissions: [...m.permissions].sort(),
    entities: m.entities.map((e) => ({
      name: e.name,
      publicRead: e.publicRead,
    })),
    actions: (m.actions ?? []).map((a) => ({
      name: a.name,
      permission: a.permission,
      mcp: a.mcp,
      public: a.public,
      flowAllowed: a.flowAllowed,
    })),
    surfaces: m.surfaces,
    apiRoutes: m.apiRoutes,
    intelligence: m.intelligence,
    name: m.name,
    version: m.version,
    events: m.events,
    schedules: m.schedules,
    webhooks: m.webhooks,
    configuration: m.configuration,
    settings: m.settings,
    commerceHooks: m.commerceHooks,
    presentation: m.presentation,
  });
  compare(
    "workflows",
    Object.fromEntries((before.lifecycles ?? []).map((c) => [c.object, c])),
    Object.fromEntries((after.lifecycles ?? []).map((c) => [c.object, c])),
  );
  compare("access", access(before), access(after));
  return changes;
}
