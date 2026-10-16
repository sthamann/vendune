/** Bounded keyset library selection retains the chosen record while navigating actual server pages. */
import { useEffect, useState } from "react";
import { shopApi } from "../api/shop-api";
import { contentText } from "../i18n/content-language";
import { useAppText } from "../i18n/app-i18n";
import type { Slot } from "./AppSlot";
import type { InputField } from "./configuration-types";
type RecordValue = Record<string, unknown>;
type Page = {
  elements: RecordValue[];
  nextCursor?: string | null;
  hasMore?: boolean;
};
export default function ConfigurationLibrary({
  slot,
  field,
  value,
  onChange,
  onError,
  language,
  mainLocale,
}: {
  slot: Slot;
  field: InputField;
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
  language: string;
  mainLocale: string;
}) {
  const { a } = useAppText();
  const [page, setPage] = useState<Page>({ elements: [] });
  const [cursors, setCursors] = useState<string[]>([""]);
  const [selected, setSelected] = useState<RecordValue>();
  const [busy, setBusy] = useState(false);
  const entity = slot.entities?.find(
    (e) => e.name === slot.configuration?.entity,
  );
  const action = entity?.action;
  const cursor = cursors.at(-1) ?? "";
  useEffect(() => {
    let active = true;
    if (!action) return;
    setBusy(true);
    shopApi<Page>(`/store-api/apps/${slot.app}/actions/${action}`, {
      limit: 100,
      ...(cursor ? { after: cursor } : {}),
    })
      .then((result) => {
        if (active) setPage(result);
      })
      .catch((error) => {
        if (active) onError((error as Error).message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [slot.app, slot.version, action, cursor, onError]);
  useEffect(() => {
    let active = true;
    if (
      !action ||
      !value ||
      selected?.id === value ||
      page.elements.some((r) => r.id === value)
    )
      return;
    shopApi<Page>(`/store-api/apps/${slot.app}/actions/${action}`, {
      id: value,
      limit: 1,
    })
      .then((result) => {
        if (active)
          setSelected(result.elements.find((record) => record.id === value));
      })
      .catch((error) => {
        if (active) onError((error as Error).message);
      });
    return () => {
      active = false;
    };
  }, [
    slot.app,
    slot.version,
    action,
    value,
    selected?.id,
    page.elements,
    onError,
  ]);
  const label = contentText(field.label, language, mainLocale);
  const nameField = entity?.fields.find((f) => f.translatable)?.name;
  const records =
    selected &&
    selected.id === value &&
    !page.elements.some((r) => r.id === value)
      ? [selected, ...page.elements]
      : page.elements;
  return (
    <div className="configuration-library" aria-busy={busy}>
      <label>
        {label}
        <select
          value={value}
          required={field.required}
          disabled={busy || !action}
          onChange={(event) => {
            const next = event.target.value;
            setSelected(records.find((r) => r.id === next));
            onChange(next);
          }}
        >
          <option value="" disabled>
            {label}
          </option>
          {records.map((record) => {
            const name = nameField ? record[nameField] : record.id;
            const title =
              typeof name === "object" && name
                ? contentText(
                    name as Record<string, string>,
                    language,
                    mainLocale,
                  )
                : String(name ?? record.id);
            return (
              <option key={String(record.id)} value={String(record.id)}>
                {title}
              </option>
            );
          })}
        </select>
      </label>
      {cursors.length > 1 || page.hasMore ? (
        <div className="configuration-pagination">
          <button
            type="button"
            disabled={busy || cursors.length < 2}
            onClick={() => setCursors((old) => old.slice(0, -1))}
          >
            {a("libraryPrevious")}
          </button>
          <button
            type="button"
            disabled={busy || !page.hasMore || !page.nextCursor}
            onClick={() => setCursors((old) => [...old, page.nextCursor!])}
          >
            {a("libraryNext")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
