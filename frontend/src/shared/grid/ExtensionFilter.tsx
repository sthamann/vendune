/** Manual exact-value app filters use the same native server predicate as MCP and reviewed agent plans. */
import { useState } from "react";
import { extensionFields } from "./extension-columns";
import { useCoreExtensionText } from "../i18n/core-extension-i18n";
import { useGridText } from "./grid-i18n";
export default function ExtensionFilter({
  rows,
  locale,
  onChange,
}: {
  rows: unknown[];
  locale: string;
  onChange: (v: string) => void;
}) {
  const t = useCoreExtensionText(),
    { g } = useGridText();
  const fields = extensionFields(rows, locale).filter(
    ({ field: f }) =>
      f.indexed &&
      !f.translatable &&
      ["string", "integer", "boolean"].includes(f.kind),
  );
  const [selected, setSelected] = useState("");
  const [value, setValue] = useState("");
  const field = fields.find((f) => f.id === selected);
  if (!fields.length) return null;
  return (
    <fieldset className="agent-grid-extension-filter">
      <legend>{t("fields")}</legend>
      <label>
        {t("field")}
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setValue("");
          }}
        >
          <option value="">{g("all")}</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("value")}
        {field?.field.kind === "boolean" ? (
          <select value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">{g("all")}</option>
            <option value="true">{t("yes")}</option>
            <option value="false">{t("no")}</option>
          </select>
        ) : (
          <input
            type={field?.field.kind === "integer" ? "number" : "text"}
            maxLength={2000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </label>
      <button
        type="button"
        disabled={
          !field ||
          value === "" ||
          (field.field.kind === "integer" &&
            !Number.isSafeInteger(Number(value)))
        }
        onClick={() => {
          if (!field) return;
          onChange(
            JSON.stringify([
              {
                app: field.extension.app,
                entity: field.extension.entity,
                field: field.field.name,
                value:
                  field.field.kind === "integer"
                    ? Number(value)
                    : field.field.kind === "boolean"
                      ? value === "true"
                      : value,
              },
            ]),
          );
        }}
      >
        {g("apply")}
      </button>
    </fieldset>
  );
}
