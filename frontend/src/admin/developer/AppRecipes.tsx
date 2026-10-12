/** Keyboard-accessible recipe entry points use the existing draft replacement and release controls. */
import Icon, { type IconName } from "../../shared/ui/Icon";
import type { Manifest } from "../../shared/apps/native/types";
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import { appRecipe, recipeIds } from "./app-recipes";
const icons: Record<string, IconName> = {
  advisor: "spark",
  returns: "box",
  erp: "link",
};
export default function AppRecipes({
  onCreate,
}: {
  onCreate: (m: Manifest) => void;
}) {
  const t = useBuildingText();
  return (
    <section className="app-recipes" aria-label={t("recipes")}>
      <h3>{t("recipes")}</h3>
      <p>{t("recipeHint")}</p>
      <div className="app-recipe-grid">
        {recipeIds.map((id) => (
          <button
            type="button"
            key={id}
            className="app-recipe"
            onClick={() =>
              onCreate(appRecipe(id, `${id}_${Date.now().toString(36)}`))
            }
          >
            <Icon name={icons[id]} size={24} />
            <strong>{t(id)}</strong>
            <span>{t(`${id}Hint`)}</span>
            <Icon name="arrow" size={16} />
          </button>
        ))}
      </div>
      <small>{t("buildPath")}</small>
    </section>
  );
}
