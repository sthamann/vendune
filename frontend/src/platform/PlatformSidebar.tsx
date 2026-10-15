/** Stable operator navigation and profile; business state remains in the console owner. */
import Brand from "../shared/ui/Brand";
import { useControlText } from "../shared/i18n/control-i18n";
import { useSecurityText } from "../shared/i18n/security-i18n";
import { usePlatformText } from "../shared/i18n/platform-i18n";
import type { Operator } from "./platform-api";
export type PlatformView =
  "overview" | "shops" | "activity" | "ai" | "infrastructure" | "security";
export default function PlatformSidebar({
  operator,
  view,
  onView,
  onLogout,
}: {
  operator: Operator;
  view: PlatformView;
  onView: (v: PlatformView) => void;
  onLogout: () => Promise<void>;
}) {
  const t = usePlatformText(),
    c = useControlText(),
    security = useSecurityText();
  return (
    <aside>
      <div className="platform-brand">
        <Brand markOnly />
      </div>
      <strong>{t("title")}</strong>
      <nav>
        {(
          [
            "overview",
            "shops",
            "ai",
            "infrastructure",
            "activity",
            "security",
          ] as const
        ).map((v) => (
          <button
            key={v}
            className={view === v ? "selected" : ""}
            onClick={() => onView(v)}
          >
            {v === "security"
              ? security("title")
              : v === "ai" || v === "infrastructure"
                ? c(v)
                : t(v)}
          </button>
        ))}
      </nav>
      <div className="platform-profile">
        <strong>{operator.user.name}</strong>
        <small>{operator.user.email}</small>
        <button onClick={() => void onLogout()}>{t("logout")}</button>
      </div>
    </aside>
  );
}
