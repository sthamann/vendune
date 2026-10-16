/** Manifest-owned configuration controls and public library choices; no client price or authorization decisions. */
import ConfigurationLibrary from "./ConfigurationLibrary";
import { contentText } from "../i18n/content-language";
import type { Slot } from "./AppSlot";
export default function ConfigurationFields({
  slot,
  fields,
  onChange,
  onError,
  language,
  mainLocale,
}: {
  slot: Slot;
  fields: Record<string, unknown>;
  onChange: (fields: Record<string, unknown>) => void;
  onError: (message: string) => void;
  language: string;
  mainLocale: string;
}) {
  const c = slot.configuration!;
  const update = (name: string, value: unknown) =>
    onChange({ ...fields, [name]: value });
  return (
    <div className="configuration-fields">
      {c.inputs?.fields.map((field) => {
        const label = contentText(field.label, language, mainLocale);
        const value = fields[field.name];
        if (field.kind === "boolean")
          return (
            <label key={field.name}>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(event) => update(field.name, event.target.checked)}
              />
              {label}
            </label>
          );
        if (c.inputs?.recordField === field.name)
          return (
            <ConfigurationLibrary
              key={field.name}
              slot={slot}
              field={field}
              value={String(value ?? "")}
              onChange={(next) => update(field.name, next)}
              onError={onError}
              language={language}
              mainLocale={mainLocale}
            />
          );
        if (field.choices?.length) {
          const choices = field.choices.map((choice) => ({
            value: choice.value,
            label: contentText(choice.label, language, mainLocale),
          }));
          return (
            <label key={field.name}>
              {label}
              <select
                value={String(value ?? "")}
                required={field.required}
                onChange={(event) => update(field.name, event.target.value)}
              >
                <option value="" disabled>
                  {label}
                </option>
                {choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={field.name}>
            {label}
            <input
              type={field.kind === "integer" ? "number" : "text"}
              value={
                typeof value === "number" || typeof value === "string"
                  ? value
                  : ""
              }
              required={field.required}
              step={field.kind === "integer" ? 1 : undefined}
              min={field.validation?.minimum}
              max={field.validation?.maximum}
              maxLength={field.validation?.maxLength ?? 2000}
              minLength={field.validation?.minLength}
              onChange={(event) =>
                update(
                  field.name,
                  field.kind === "integer" && event.target.value !== ""
                    ? Number(event.target.value)
                    : event.target.value,
                )
              }
            />
          </label>
        );
      })}
    </div>
  );
}
