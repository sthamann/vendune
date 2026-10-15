/** Form captions edit the same model fields rendered by the native form and data-model editor. */
import type { Manifest, Block } from "../../shared/apps/native/types";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { useAppWorkspaceText } from "../../shared/i18n/app-workspace-i18n";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
import { textMap } from "./app-model";
export default function AppFormFields({
  manifest,
  block,
  onChange,
}: {
  manifest: Manifest;
  block: Block;
  onChange: (m: Manifest) => void;
}) {
  const w = useAppWorkspaceText(),
    { a } = useAppStudioText();
  const entity = manifest.entities.find((e) => e.name === block.entity);
  if (!entity) return null;
  return (
    <section className="app-form-fields">
      <h3>{w("editFields")}</h3>
      {entity.fields
        .filter((f) => !f.coreReference)
        .map((f) => (
          <div key={f.name}>
            <LocalizedField
              label={`${a("field")} · ${f.name}`}
              value={f.label}
              onChange={(value) =>
                onChange({
                  ...manifest,
                  entities: manifest.entities.map((e) =>
                    e.name !== entity.name
                      ? e
                      : {
                          ...e,
                          fields: e.fields.map((old) =>
                            old.name !== f.name
                              ? old
                              : { ...old, label: textMap(value) },
                          ),
                        },
                  ),
                })
              }
              maxLength={100}
            />
            <small>
              {a(f.kind)} · {f.required ? a("required") : w("optional")}
            </small>
          </div>
        ))}
    </section>
  );
}
