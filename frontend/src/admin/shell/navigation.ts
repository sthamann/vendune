/** Typed built-in Studio navigation and locale-specific labels. */
import { useB2BText } from "../../shared/i18n/b2b-i18n";
import { usePosText } from "../pos/pos-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import { useWorkbenchText } from "../../shared/i18n/workbench-i18n";
import { type IconName } from "../../shared/ui/Icon";
import { useWorkspaceText } from "../workspace/workspace-i18n";
export type Tab =
  | "workspace"
  | "design"
  | "assistant"
  | "overview"
  | "knowledge"
  | "agents"
  | "commerce"
  | "users"
  | "apps"
  | "storyfronts"
  | "developers"
  | "environments"
  | "automation"
  | "productData"
  | "orders"
  | "customers"
  | "channels"
  | "pos"
  | "b2b";

export function useStudioNavigation() {
  const { t } = useLocale();
  const personal = useWorkspaceText();
  const p = usePosText();
  const b = useB2BText();
  const { w } = useWorkbenchText();
  const { o } = useOperationsText();
  const tabLabel = (id: Tab): string => {
    if (id === "workspace") return personal("title");
    if (id === "design") return personal("design");
    if (id === "b2b") return b("title");
    if (id === "pos") return p("title");
    if (id === "channels") return w("channels");
    if (id === "commerce") return t("settings");
    if (id === "orders" || id === "customers") return o(id);
    if (
      id === "storyfronts" ||
      id === "developers" ||
      id === "environments" ||
      id === "automation" ||
      id === "productData"
    )
      return w(id);
    return t(id);
  };

  const nav: { id: Tab; icon: IconName }[] = [
    { id: "workspace", icon: "gauge" },
    { id: "design", icon: "palette" },
    { id: "assistant", icon: "chat" },
    { id: "overview", icon: "pulse" },
    { id: "b2b", icon: "people" },
    { id: "pos", icon: "register" },
    { id: "orders", icon: "box" },
    { id: "customers", icon: "people" },
    { id: "knowledge", icon: "graph" },
    { id: "agents", icon: "agents" },
    { id: "commerce", icon: "settings" },
    { id: "productData", icon: "box" },
    { id: "channels", icon: "layers" },
    { id: "automation", icon: "pulse" },
    { id: "users", icon: "lock" },
    { id: "storyfronts", icon: "layers" },
    { id: "developers", icon: "code" },
    { id: "environments", icon: "layers" },
    { id: "apps", icon: "plus" },
  ];

  return { tabLabel, nav };
}
