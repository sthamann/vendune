/** Independent settings workspace: grouped navigation, explicit dirty-draft guards and native API forms. */
import { useAdminCreationText } from "../../shared/i18n/admin-creation-i18n";
import B2BSettings from "./B2BSettings";
import { useB2BExperienceText } from "../b2b/experience-i18n";
import { useCurrencyText } from "../../shared/i18n/currency-i18n";
import { useCrmText } from "../../shared/i18n/crm-i18n";
import LegalSettings from "../legal/LegalSettings";
import { useLegalText } from "../../shared/i18n/legal-i18n";
import CustomerGroupsSettings from "./CustomerGroupsSettings";
import { useState } from "react";
import { useCustomerText } from "../../shared/i18n/customer-i18n";
import { useShopText } from "../../shared/i18n/shop-i18n";
import { useWorkbenchText } from "../../shared/i18n/workbench-i18n";
import { useStudioText } from "../../shared/i18n/studio-ui-i18n";
import Icon, { type IconName } from "../../shared/ui/Icon";
import type { RequestFn } from "../shell/studio-types";
import "../styles/settings.css";
import { useInternationalText } from "../../shared/i18n/international-i18n";
import CommerceSettings from "./CommerceSettings";
import MasterDataSettings from "./MasterDataSettings";
type Area =
  | "b2b"
  | "masterData"
  | "taxes"
  | "countries"
  | "shipping"
  | "payment"
  | "languages"
  | "currencies"
  | "customerGroups"
  | "legal";
export default function SettingsWorkspace({
  request,
  rights,
  onConnections,
  onTeam,
  onAutomation,
  onB2B,
  onChannels,
  onApps,
}: {
  request: RequestFn;
  rights: string[];
  onConnections: () => void;
  onTeam: () => void;
  onAutomation: () => void;
  onB2B?: () => void;
  onChannels?: () => void;
  onApps?: () => void;
}) {
  const { n } = useAdminCreationText();
  const [query, setQuery] = useState("");
  const b = useB2BExperienceText();
  const { c } = useCustomerText(),
    { s, t } = useShopText(),
    { w } = useWorkbenchText(),
    { u } = useStudioText(),
    { i } = useInternationalText();
  const { c: ct } = useCurrencyText();
  const { r } = useCrmText();
  const { l } = useLegalText();
  const [area, setArea] = useState<Area>(() => {
    const requested = new URLSearchParams(location.search).get("settings");
    return [
      "b2b",
      "masterData",
      "taxes",
      "countries",
      "shipping",
      "payment",
      "languages",
      "currencies",
      "customerGroups",
      "legal",
    ].includes(requested ?? "")
      ? (requested as Area)
      : "masterData";
  });
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const navigate = (action: () => void) => {
    if (dirty) setPending(() => action);
    else action();
  };
  const entries: { id: Area; label: string; hint: string; icon: IconName }[] = [
    {
      id: "b2b",
      label: b("settings"),
      hint: b("settingsHint"),
      icon: "building",
    },
    { id: "currencies", label: ct("title"), hint: ct("hint"), icon: "globe" },
    {
      id: "masterData",
      label: c("masterData"),
      hint: u("companyHint"),
      icon: "building",
    },
    {
      id: "taxes",
      label: s("taxes"),
      hint: i("destinationRules"),
      icon: "percent",
    },
    {
      id: "languages",
      label: i("languages"),
      hint: i("languageHint"),
      icon: "globe",
    },
    {
      id: "countries",
      label: c("countries"),
      hint: u("countriesHint"),
      icon: "globe",
    },
    {
      id: "shipping",
      label: s("shipping"),
      hint: u("shippingHint"),
      icon: "truck",
    },
    {
      id: "customerGroups",
      label: r("groups"),
      hint: r("groupsHint"),
      icon: "people",
    },
    {
      id: "payment",
      label: s("payment"),
      hint: u("paymentHint"),
      icon: "card",
    },
    { id: "legal", label: l("title"), hint: l("hint"), icon: "lock" },
  ];
  const groups = [
    { label: n("basics"), ids: ["masterData", "legal"] },
    {
      label: n("markets"),
      ids: ["languages", "countries", "currencies", "taxes"],
    },
    { label: n("checkout"), ids: ["shipping", "payment"] },
    { label: n("customers"), ids: ["customerGroups", "b2b"] },
  ];
  const selectArea = (next: Area) => {
    if (area === next) return;
    const independent = ["masterData", "customerGroups", "legal", "b2b"];
    if (!independent.includes(area) && !independent.includes(next))
      setArea(next);
    else navigate(() => setArea(next));
  };
  const matches = (item: (typeof entries)[number]) =>
    `${item.label} ${item.hint}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
  return (
    <div className="studio-page operations settings-workspace">
      <div className="page-intro">
        <span className="kicker">{u("workspace")}</span>
        <h1>{c("settings")}</h1>
        <p>{u("settingsHint")}</p>
      </div>
      {pending && (
        <div className="settings-discard" role="alert">
          <p>{u("discardHint")}</p>
          <div>
            <button
              className="studio-secondary"
              onClick={() => setPending(null)}
            >
              {u("keepEditing")}
            </button>
            <button
              className="studio-primary"
              onClick={() => {
                setDirty(false);
                pending();
                setPending(null);
              }}
            >
              {u("discard")}
            </button>
          </div>
        </div>
      )}
      <div className="settings-layout">
        <nav className="settings-navigation" aria-label={c("settings")}>
          <label className="settings-search">
            {n("searchSettings")}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="settings-mobile-picker">
            {c("settings")}
            <select
              value={area}
              onChange={(e) => selectArea(e.target.value as Area)}
            >
              {groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.ids.map((id) => {
                    const item = entries.find((entry) => entry.id === id)!;
                    return (
                      <option key={id} value={id}>
                        {item.label}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </label>
          {groups.map((group) => (
            <div className="settings-nav-group" key={group.label}>
              <span className="settings-nav-label">{group.label}</span>
              {group.ids
                .map((id) => entries.find((item) => item.id === id)!)
                .filter(matches)
                .map((item) => (
                  <button
                    key={item.id}
                    aria-current={area === item.id ? "page" : undefined}
                    onClick={() => selectArea(item.id)}
                  >
                    <Icon name={item.icon} size={19} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </button>
                ))}
            </div>
          ))}
          {!entries.some(matches) && <p role="status">{n("noSettings")}</p>}
          <span className="settings-nav-label">{u("connectedAreas")}</span>
          {[
            {
              right: "channels.read",
              label: w("channels"),
              hint: n("channelsHint"),
              icon: "globe" as const,
              action: onChannels,
            },
            {
              right: "apps.read",
              label: n("apps"),
              hint: n("appsHint"),
              icon: "box" as const,
              action: onApps,
            },
            {
              right: "automation.read",
              label: w("automation"),
              hint: u("automationHint"),
              icon: "graph" as const,
              action: onAutomation,
            },
            {
              right: "team.manage",
              label: t("users"),
              hint: u("teamHint"),
              icon: "people" as const,
              action: onTeam,
            },
            {
              right: "ai.manage",
              label: c("providerConnections"),
              hint: u("aiHint"),
              icon: "spark" as const,
              action: onConnections,
            },
          ]
            .filter((item) => rights.includes(item.right) && item.action)
            .map((item) => (
              <button key={item.label} onClick={() => navigate(item.action!)}>
                <Icon name={item.icon} size={19} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                <Icon name="arrow" size={14} />
              </button>
            ))}
        </nav>
        <div className="settings-body">
          {area === "b2b" ? (
            <B2BSettings
              request={request}
              canWrite={rights.includes("settings.write")}
              onDirty={setDirty}
              onCompanies={rights.includes("b2b.read") ? onB2B : undefined}
            />
          ) : area === "masterData" ? (
            <MasterDataSettings
              request={request}
              canWrite={rights.includes("settings.write")}
              onDirty={setDirty}
            />
          ) : area === "legal" ? (
            <LegalSettings
              request={request}
              rights={rights}
              canWrite={rights.includes("settings.write")}
              onDirty={setDirty}
            />
          ) : area === "customerGroups" ? (
            <CustomerGroupsSettings
              request={request}
              canWrite={rights.includes("settings.write")}
              onDirty={setDirty}
            />
          ) : (
            <CommerceSettings
              request={request}
              area={area}
              rights={rights}
              canWrite={rights.includes("settings.write")}
              onDirty={setDirty}
            />
          )}
        </div>
      </div>
    </div>
  );
}
