/** Native managed-record form retains revisions and inherited translations; it never executes schema code. */
import { useEffect, useRef, useState } from "react";
import { useAppStudioText } from "../../i18n/app-studio-i18n";
import { useNativeRuntime } from "./NativeRuntime";
import NativeField from "./NativeField";
import { EditorBuffer } from "../../content/editor/EditorBuffer";
import type { AppRecord, Entity } from "./types";
import { recordFields, workflowField } from "./record-workflow";
import { useContentLanguage } from "../../i18n/ContentLanguage";
import { contentText } from "../../i18n/content-language";
export default function NativeRecordForm({
  blockId,
  entity,
  records,
  save,
  saved,
  boundFields,
  externalSubmit = false,
  singleRecord = false,
  readOnly = false,
}: {
  singleRecord?: boolean;
  readOnly?: boolean;
  blockId?: string;
  externalSubmit?: boolean;
  boundFields?: Record<string, string>;
  entity: Entity;
  records: AppRecord[];
  save: (value: {
    id: string;
    revision: number;
    fields: Record<string, unknown>;
  }) => Promise<void>;
  saved: () => void;
}) {
  const { a, locale } = useAppStudioText();
  const { mainLocale } = useContentLanguage();
  const runtime = useNativeRuntime(),
    form = useRef<HTMLFormElement>(null);
  const [pendingSource, setPendingSource] = useState(false);
  const initial = boundFields ? records[0] : undefined;
  const [selected, setSelected] = useState(initial?.id ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [revision, setRevision] = useState(initial?.revision ?? 0);
  const [confirmed, setConfirmed] = useState<AppRecord>();
  const submitted = useRef<Record<string, unknown>>({});
  const choices = confirmed
    ? [...records.filter((r) => r.id !== confirmed.id), confirmed]
    : records;
  const persisted = choices.find((r) => r.id === id);
  const [fields, setFields] = useState<Record<string, unknown>>(
    recordFields(entity, initial, boundFields),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(false);
  const setField = (name: string, value: unknown) => {
    setFields((old) => ({ ...old, [name]: value }));
    setNotice(false);
  };
  useEffect(() => {
    if (!runtime || !blockId) return;
    return runtime.register(blockId, {
      fieldEditor: {
        entity: entity.name,
        recordId: id,
        accepts: (name) =>
          !busy &&
          !pendingSource &&
          !Object.hasOwn(boundFields ?? {}, name) &&
          !(persisted && entity.workflow?.immutableFields?.includes(name)) &&
          entity.fields.some((f) => f.name === name && !f.coreReference),
        set: setField,
      },
      value: () => {
        const merged = { ...fields, ...boundFields };
        for (const f of entity.fields.filter((f) => f.kind === "json"))
          if (typeof merged[f.name] === "string")
            merged[f.name] = JSON.parse(merged[f.name] as string);
        submitted.current = structuredClone(merged);
        return { id: id || crypto.randomUUID(), revision, fields: merged };
      },
      validate: () =>
        !pendingSource && !busy && (form.current?.reportValidity() ?? false),
      accepted: (result) => {
        const r = result as { id?: string; revision?: number };
        if (r.id) setId(r.id);
        if (r.revision) setRevision(r.revision);
        if (r.id && r.revision) {
          setConfirmed({
            ...submitted.current,
            id: r.id,
            revision: r.revision,
          });
          setSelected(r.id);
        }
        setNotice(true);
      },
    });
  }, [
    runtime?.register,
    blockId,
    id,
    revision,
    fields,
    boundFields,
    pendingSource,
    busy,
    entity,
    persisted,
  ]);
  return (
    <EditorBuffer.Provider
      value={{ pending: pendingSource, setPending: setPendingSource }}
    >
      <form
        ref={form}
        className="native-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || runtime?.busy || pendingSource) return;
          setBusy(true);
          setError("");
          setNotice(false);
          try {
            await save({ id: id || crypto.randomUUID(), revision, fields });
            setSelected("");
            setId("");
            setRevision(0);
            setFields(recordFields(entity, undefined, boundFields));
            setConfirmed(undefined);
            setNotice(true);
            saved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!singleRecord && (!boundFields || choices.length > 0) && (
          <>
            <label>
              {a("record")}
              <select
                value={selected}
                onChange={(e) => {
                  const value = choices.find((r) => r.id === e.target.value);
                  setSelected(e.target.value);
                  setId(value?.id ?? "");
                  setRevision(value?.revision ?? 0);
                  setError("");
                  setNotice(false);
                  setFields(recordFields(entity, value, boundFields));
                }}
              >
                <option value="">{a("newRecord")}</option>
                {choices.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(() => {
                      const f = entity.fields.find(
                        (f) => f.translatable && f.kind === "string",
                      );
                      return f
                        ? contentText(
                            r[f.name] as Record<string, string>,
                            locale,
                            mainLocale,
                          ) || r.id
                        : r.id;
                    })()}
                  </option>
                ))}
              </select>
            </label>
            {!boundFields && (
              <label>
                {a("id")}
                <input
                  maxLength={100}
                  value={id}
                  disabled={!!selected}
                  onChange={(e) => setId(e.target.value)}
                />
              </label>
            )}
          </>
        )}
        {entity.fields
          .filter((f) => !boundFields || !(f.name in boundFields))
          .map((f) => (
            <fieldset
              key={f.name}
              className="native-field-boundary"
              disabled={
                readOnly ||
                (!!persisted &&
                  entity.workflow?.immutableFields?.includes(f.name))
              }
            >
              <NativeField
                field={workflowField(entity, f, persisted)}
                value={fields[f.name]}
                onChange={(v) => setField(f.name, v)}
              />
            </fieldset>
          ))}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{a("savedRecord")}</p>}
        {!externalSubmit && !readOnly && (
          <button
            className="studio-primary"
            disabled={busy || runtime?.busy || pendingSource}
          >
            {a(busy ? "loading" : "save")}
          </button>
        )}
      </form>
    </EditorBuffer.Provider>
  );
}
