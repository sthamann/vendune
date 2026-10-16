/** Draft summary mirrors chosen locations without changing publication state or generated permissions. */
import Icon from "../../shared/ui/Icon";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import { contentText } from "../../shared/i18n/content-language";
import { useAssistantText } from "../../shared/i18n/app-assistant-i18n";
import type { Manifest } from "../../shared/apps/native/types";
import { placements } from "./assistant-model";
export default function AppCreationSummary({
  name,
  selected,
  onRemove,
}: {
  name: Manifest["name"];
  selected: string[];
  onRemove: (location: string) => void;
}) {
  const { t } = useAssistantText(),
    { language, mainLocale } = useContentLanguage();
  return (
    <aside className="app-creation-summary" aria-label={t("selectedAreas")}>
      <span className="app-creation-private">
        <Icon name="lock" size={14} />
        {t("privateDraft")}
      </span>
      <h3>{contentText(name, language, mainLocale) || t("appName")}</h3>
      <p>{t("draftSafety")}</p>
      <h4>{t("selectedAreas")}</h4>
      {selected.length ? (
        <ul>
          {selected.map((v) => (
            <li key={v}>
              <Icon name="check" size={16} />
              <span>{t(placements[v])}</span>
              <button
                type="button"
                className="app-icon-button"
                aria-label={t("removeArea").replace("{area}", t(placements[v]))}
                onClick={() => onRemove(v)}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status">{t("selectAreas")}</p>
      )}
      <div className="app-creation-next">
        <Icon name="palette" size={21} />
        <p>{t("nextDesign")}</p>
      </div>
    </aside>
  );
}
