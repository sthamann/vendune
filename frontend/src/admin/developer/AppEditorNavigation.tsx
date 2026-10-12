/** Consistent navigation between visual definitions, provider contracts and immutable versions. */
import Icon, { type IconName } from "../../shared/ui/Icon";
import {
  useAppStudioText,
  type AppStudioKey,
} from "../../shared/i18n/app-studio-i18n";
export default function AppEditorNavigation({
  section,
  onSelect,
  versions,
  payments = false,
}: {
  section: AppStudioKey;
  onSelect: (s: AppStudioKey) => void;
  versions: number;
  payments?: boolean;
}) {
  const { a } = useAppStudioText();
  const tabs = [
    "design",
    "data",
    "connect",
    "payments",
    "agent",
    "versions",
  ] as const;
  const icons: Record<(typeof tabs)[number], IconName> = {
    design: "palette",
    data: "database",
    connect: "graph",
    payments: "card",
    agent: "code",
    versions: "history",
  };
  return (
    <nav className="app-studio-tabs" aria-label={a("studio")}>
      {tabs
        .filter((key) => key !== "payments" || payments)
        .map((key) => (
          <button
            key={key}
            aria-current={section === key ? "page" : undefined}
            className={section === key ? "active" : ""}
            onClick={() => onSelect(key)}
          >
            <Icon name={icons[key]} size={17} />
            {a(key)}
            {key === "versions" && <span>{versions}</span>}
          </button>
        ))}
      <span className="app-tabs-caption">{a("pending")}</span>
    </nav>
  );
}
