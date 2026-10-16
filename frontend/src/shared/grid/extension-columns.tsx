/** Permission-filtered native extension metadata supplies optional columns and exact indexed filters. */
import type { CoreExtension } from "../apps/CoreExtensions";
import type { GridColumn } from "./types";
import { contentText } from "../i18n/content-language";
import type { Field } from "../apps/native/types";
export type ExtensionColumn = {
  id: string;
  label: string;
  extension: CoreExtension;
  field: Field;
};
export function extensionFields(
  rows: readonly unknown[],
  locale: string,
): ExtensionColumn[] {
  const fields = new Map<string, ExtensionColumn>();
  for (const row of rows)
    for (const x of (row as { extensions?: CoreExtension[] }).extensions ??
      []) {
      for (const field of x.model.fields.filter(
        (f) => f.name !== x.model.extends?.field,
      )) {
        const id = `app:${x.app}:${x.entity}:${field.name}`;
        fields.set(id, {
          id,
          extension: x,
          field,
          label: `${contentText(x.label ?? {}, locale, x.language.mainLocale) || x.entity} · ${contentText(field.label ?? {}, locale, x.language.mainLocale) || field.name}`,
        });
      }
    }
  return [...fields.values()];
}
export function extensionColumns<Row>(
  rows: Row[],
  locale: string,
): GridColumn<Row>[] {
  return extensionFields(rows, locale).map(
    ({ id, label, extension: x, field }) => ({
      id,
      label,
      hidden: true,
      render: (row) => {
        const current = (
          row as { extensions?: CoreExtension[] }
        ).extensions?.find((e) => e.app === x.app && e.entity === x.entity);
        const value = current?.record?.[field.name];
        if (value == null) return "—";
        if (field.translatable)
          return contentText(
            value as Record<string, string>,
            locale,
            x.language.mainLocale,
          );
        if (field.choices?.length)
          return (
            contentText(
              field.choices.find((c) => c.value === value)?.label ?? {},
              locale,
              x.language.mainLocale,
            ) || String(value)
          );
        return typeof value === "object"
          ? JSON.stringify(value).slice(0, 160)
          : String(value);
      },
    }),
  );
}

export function extensionFilterSummary(
  input: string,
  rows: unknown[],
  locale: string,
): string {
  try {
    const fields = extensionFields(rows, locale);
    const filters = JSON.parse(input) as {
      app: string;
      entity: string;
      field: string;
      value: string | boolean | number;
    }[];
    return filters
      .map(
        (f) =>
          `${fields.find((field) => field.id === `app:${f.app}:${f.entity}:${f.field}`)?.label ?? f.field} = ${String(f.value)}`,
      )
      .join(" · ");
  } catch {
    return "—";
  }
}
