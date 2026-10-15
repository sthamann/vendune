/** Versioned setting declarations share the native Manifest; no credential value enters a draft. */
import type { Manifest } from "../../shared/apps/native/types";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { useAppSettingText } from "../../shared/i18n/app-settings-i18n";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
import { nextId, textMap } from "./app-model";
export default function AppSettingsEditor({
  manifest,
  onChange,
}: {
  manifest: Manifest;
  onChange: (m: Manifest) => void;
}) {
  const t = useAppSettingText(),
    { a } = useAppStudioText(),
    fields = manifest.settings ?? [];
  return (
    <section className="app-settings-editor">
      <h2>{t("settings")}</h2>
      <p>{t("hint")}</p>
      <p>{t("runtime")}</p>
      {fields.map((f, i) => (
        <article className="app-model-card" key={i}>
          <div className="app-key-fields">
            <label>
              {t("key")}
              <input
                value={f.key}
                maxLength={32}
                onChange={(e) =>
                  onChange({
                    ...manifest,
                    settings: fields.map((v, n) =>
                      n === i ? { ...v, key: e.target.value } : v,
                    ),
                  })
                }
              />
            </label>
            <LocalizedField
              label={t("label")}
              value={f.label}
              onChange={(label) =>
                onChange({
                  ...manifest,
                  settings: fields.map((v, n) =>
                    n === i ? { ...v, label: textMap(label) } : v,
                  ),
                })
              }
              maxLength={100}
            />
            <label>
              {a("type")}
              <select
                value={f.kind}
                onChange={(e) =>
                  onChange({
                    ...manifest,
                    settings: fields.map((v, n) =>
                      n === i
                        ? { ...v, kind: e.target.value as typeof f.kind }
                        : v,
                    ),
                  })
                }
              >
                {(["string", "secret", "boolean", "integer"] as const).map(
                  (k) => (
                    <option key={k} value={k}>
                      {t(k)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="app-check">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) =>
                  onChange({
                    ...manifest,
                    settings: fields.map((v, n) =>
                      n === i ? { ...v, required: e.target.checked } : v,
                    ),
                  })
                }
              />
              {t("required")}
            </label>
            <button
              type="button"
              className="studio-secondary"
              onClick={() =>
                onChange({
                  ...manifest,
                  settings: fields.filter((_, n) => n !== i),
                })
              }
            >
              {a("delete")}
            </button>
          </div>
        </article>
      ))}
      <button
        type="button"
        className="studio-secondary"
        disabled={fields.length >= 16}
        onClick={() =>
          onChange({
            ...manifest,
            settings: [
              ...fields,
              {
                key: nextId(
                  "setting",
                  fields.map((f) => f.key),
                ),
                label: {},
                kind: "string",
                required: false,
              },
            ],
          })
        }
      >
        {t("add")}
      </button>
    </section>
  );
}
