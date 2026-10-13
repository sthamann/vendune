/** Presentation admission mirrors named server rights. API/domain checks remain authoritative. */
import type { Tab } from "./navigation";
const moduleRights: Record<Tab, string[]> = {
  assistant: ["assistant.use"],
  overview: ["overview.read", "orders.read"],
  knowledge: ["knowledge.read"],
  agents: ["assistant.use"],
  productData: ["catalog.read"],
  orders: ["orders.read"],
  customers: ["customers.read"],
  b2b: ["b2b.read"],
  pos: ["pos.use"],
  channels: ["channels.read"],
  automation: ["automation.read"],
  apps: ["apps.read"],
  storyfronts: ["apps.read"],
  developers: ["developer.read", "team.manage"],
  environments: ["environments.read"],
  users: ["team.manage"],
  commerce: ["settings.read"],
};
export function canOpenStudio(tab: Tab, rights: string[]) {
  if (
    ["customers", "orders"].includes(tab) &&
    !rights.includes("customers.pii")
  )
    return false;
  if (
    ["assistant", "agents"].includes(tab) &&
    !["catalog.read", "orders.read", "knowledge.read"].every((p) =>
      rights.includes(p),
    )
  )
    return false;
  return moduleRights[tab].some((p) => rights.includes(p));
}
export function firstStudioTab(rights: string[]): Tab | undefined {
  return (Object.keys(moduleRights) as Tab[]).find((tab) =>
    canOpenStudio(tab, rights),
  );
}
