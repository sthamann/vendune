/** Visual status edges use the exact app manifest contract enforced by native record storage. */
import type { Entity } from "../../shared/apps/native/types";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import { contentText } from "../../shared/i18n/content-language";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
export default function AppWorkflowEditor({
  entity,
  onChange,
}: {
  entity: Entity;
  onChange: (e: Entity) => void;
}) {
  const { a, locale } = useAppStudioText();
  const { mainLocale } = useContentLanguage();
  const fields = entity.fields.filter(
    (f) =>
      f.kind === "string" && !f.translatable && f.required && f.choices?.length,
  );
  const w = entity.workflow,
    field = fields.find((f) => f.name === w?.field);
  const label = (value: string) =>
    contentText(
      field?.choices?.find((c) => c.value === value)?.label ?? {},
      locale,
      mainLocale,
    ) || value;
  return (
    <details className="app-workflow-editor" open={!!w}>
      <summary>{a("recordWorkflow")}</summary>
      <p>{a("workflowHint")}</p>
      <label>
        {a("workflowField")}
        <select
          value={w?.field ?? ""}
          onChange={(e) => {
            const f = fields.find((f) => f.name === e.target.value);
            onChange({
              ...entity,
              workflow: f
                ? {
                    field: f.name,
                    initial: f.choices![0].value,
                    transitions: [],
                    immutableFields: [],
                  }
                : undefined,
            });
          }}
        >
          <option value="">{a("noWorkflow")}</option>
          {fields.map((f) => (
            <option key={f.name} value={f.name}>
              {contentText(f.label, locale, mainLocale) || f.name}
            </option>
          ))}
        </select>
      </label>
      {w && field && (
        <>
          <label>
            {a("initialState")}
            <select
              value={w.initial}
              onChange={(e) =>
                onChange({
                  ...entity,
                  workflow: { ...w, initial: e.target.value },
                })
              }
            >
              {field.choices!.map((c) => (
                <option key={c.value} value={c.value}>
                  {label(c.value)}
                </option>
              ))}
            </select>
          </label>
          <div className="app-workflow-edges">
            {field.choices!.flatMap((from) =>
              field
                .choices!.filter((to) => to.value !== from.value)
                .map((to) => {
                  const checked = w.transitions.some(
                    (t) => t.from === from.value && t.to === to.value,
                  );
                  return (
                    <label
                      className="app-check"
                      key={`${from.value}:${to.value}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          onChange({
                            ...entity,
                            workflow: {
                              ...w,
                              transitions: e.target.checked
                                ? [
                                    ...w.transitions,
                                    { from: from.value, to: to.value },
                                  ]
                                : w.transitions.filter(
                                    (t) =>
                                      !(
                                        t.from === from.value &&
                                        t.to === to.value
                                      ),
                                  ),
                            },
                          })
                        }
                      />
                      {label(from.value)} → {label(to.value)}
                    </label>
                  );
                }),
            )}
          </div>
          <fieldset>
            <legend>{a("immutableFields")}</legend>
            {entity.fields
              .filter((f) => f.name !== w.field)
              .map((f) => (
                <label className="app-check" key={f.name}>
                  <input
                    type="checkbox"
                    checked={w.immutableFields?.includes(f.name) ?? false}
                    onChange={(e) =>
                      onChange({
                        ...entity,
                        workflow: {
                          ...w,
                          immutableFields: e.target.checked
                            ? [...(w.immutableFields ?? []), f.name]
                            : w.immutableFields?.filter((n) => n !== f.name),
                        },
                      })
                    }
                  />
                  {contentText(f.label, locale, mainLocale) || f.name}
                </label>
              ))}
          </fieldset>
        </>
      )}
    </details>
  );
}
