/** One understandable native-object selection; relationships, uniqueness and scopes compile together. */
import type { Entity } from "../../shared/apps/native/types";
import { useCoreExtensionText } from "../../shared/i18n/core-extension-i18n";
import { bindExtension, type CoreObject } from "./core-extension-model";
export default function CoreExtensionBinding({
  entity,
  onChange,
}: {
  entity: Entity;
  onChange: (e: Entity) => void;
}) {
  const t = useCoreExtensionText();
  return (
    <div className="app-data-safety">
      <label>
        {t("binding")}
        <select
          value={entity.extends?.object ?? ""}
          disabled={!entity.extends && entity.fields.length >= 16}
          onChange={(e) =>
            onChange(
              bindExtension(
                entity,
                (e.target.value || undefined) as CoreObject | undefined,
              ),
            )
          }
        >
          <option value="">{t("independent")}</option>
          {(["product", "customer", "order", "company"] as const).map(
            (object) => (
              <option value={object} key={object}>
                {t(object)}
              </option>
            ),
          )}
        </select>
      </label>
      <p>{t("hint")}</p>
    </div>
  );
}
