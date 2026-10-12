/** App Studio heading and new-app entry share the localized workbench language. */
import Icon from "../../shared/ui/Icon";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
export default function AppStudioIntro({
  disabled,
  onNew,
}: {
  disabled: boolean;
  onNew: () => void;
}) {
  const { a } = useAppStudioText();
  return (
    <div className="app-studio-intro">
      <div>
        <span className="kicker">
          <Icon name="code" size={14} />
          {a("studio")}
        </span>
        <h1>{a("studio")}</h1>
        <p>{a("hint")}</p>
      </div>
      <button className="studio-secondary" disabled={disabled} onClick={onNew}>
        <Icon name="plus" size={16} />
        {a("reset")}
      </button>
    </div>
  );
}
