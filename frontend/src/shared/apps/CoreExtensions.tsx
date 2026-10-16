/** Native object fields reuse managed forms, current app actions and the shop's content-language scope. */
import "../styles/native-app.css";
import { useState, type ReactNode } from "react";
import type { RequestFn } from "../api/types";
import type { AppRecord, Entity, NativePayload } from "./native/types";
import {
  ContentLanguage,
  useOptionalContentLanguage,
} from "../i18n/ContentLanguage";
import ContentLanguagePicker from "../i18n/ContentLanguagePicker";
import { contentText } from "../i18n/content-language";
import { useAppStudioText } from "../i18n/app-studio-i18n";
import { useCoreExtensionText } from "../i18n/core-extension-i18n";
import NativeRuntime from "./native/NativeRuntime";
import NativeRecordForm from "./native/NativeRecordForm";

export type CoreExtension = {
  app: string;
  version: string;
  entity: string;
  label: Record<string, string>;
  model: Entity;
  readAction: string;
  writeAction?: string | null;
  record?: AppRecord | null;
  language: { mainLocale: string; locales: string[] };
  native: Pick<NativePayload, "lookupActions" | "assetActions">;
};
export type CoreExtensionData = {
  extensions?: CoreExtension[];
  omittedExtensions?: number;
};
export function extensionData(value: CoreExtensionData): CoreExtensionData {
  return {
    extensions: value.extensions,
    omittedExtensions: value.omittedExtensions,
  };
}
export function useCoreExtensions() {
  const [data, setData] = useState<CoreExtensionData>({});
  return [
    data,
    (value: CoreExtensionData) => setData(extensionData(value)),
  ] as const;
}
export default function CoreExtensions({
  objectId,
  extensions = [],
  omittedExtensions = 0,
  request,
}: {
  objectId: string;
  extensions?: CoreExtension[];
  omittedExtensions?: number;
  request: RequestFn;
}) {
  const t = useCoreExtensionText();
  return (
    <ExtensionLanguage language={extensions[0]?.language}>
      <div className="core-extensions">
        {omittedExtensions > 0 && <p role="status">{t("omitted")}</p>}
        {extensions.map((extension) => (
          <Extension
            key={`${objectId}:${extension.app}:${extension.entity}:${extension.version}`}
            extension={extension}
            objectId={objectId}
            request={request}
          />
        ))}
      </div>
    </ExtensionLanguage>
  );
}
function Extension({
  extension: x,
  objectId,
  request,
}: {
  extension: CoreExtension;
  objectId: string;
  request: RequestFn;
}) {
  const { a, locale } = useAppStudioText();
  const [record, setRecord] = useState(x.record);
  const [epoch, setEpoch] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const model = {
    ...x.model,
    label: x.model.label ?? {},
    fields: x.model.fields.map((f) => ({ ...f, label: f.label ?? {} })),
  };
  const anchor = model.extends!.field;
  const native: NativePayload = {
    ...x.native,
    entities: [model],
    view: { id: "extension", layout: "form", blocks: [] },
  };
  return (
    <section
      className="native-block core-extension"
      onInputCapture={() => setConfirmed(false)}
      onClickCapture={() => setConfirmed(false)}
    >
      <header>
        <h3>
          {contentText(x.label ?? {}, locale, x.language.mainLocale) ||
            x.entity}
        </h3>
        <small>
          {x.app} · {x.version}
        </small>
      </header>

      <NativeRuntime
        app={x.app}
        native={native}
        request={request}
        locale={locale}
        mainLocale={x.language.mainLocale}
      >
        <NativeRecordForm
          key={epoch}
          entity={model}
          records={record ? [record] : []}
          boundFields={{ [anchor]: objectId }}
          singleRecord
          readOnly={!x.writeAction}
          save={async (value) => {
            setConfirmed(false);
            const fields = { ...value.fields, [anchor]: objectId };
            const accepted = await request(
              `/api/apps/${x.app}/actions/${x.writeAction}`,
              {
                id: record?.id ?? crypto.randomUUID(),
                revision: record?.revision ?? 0,
                fields,
              },
            );
            setRecord({
              ...fields,
              id: accepted.id,
              revision: accepted.revision,
            });
            setConfirmed(true);
          }}
          saved={() => setEpoch((n) => n + 1)}
        />
      </NativeRuntime>
      {confirmed && <p role="status">{a("savedRecord")}</p>}
    </section>
  );
}

function ExtensionLanguage({
  language,
  children,
}: {
  language?: CoreExtension["language"];
  children: ReactNode;
}) {
  const parent = useOptionalContentLanguage();
  if (!language) return children;
  const matches = language.locales.filter(
    (l) => l.split("-")[0] === parent?.language.split("-")[0],
  );
  const selected = parent
    ? language.locales.includes(parent.language)
      ? parent.language
      : matches.length === 1
        ? matches[0]
        : language.mainLocale
    : undefined;
  return (
    <ContentLanguage
      locales={language.locales}
      mainLocale={language.mainLocale}
      language={selected}
    >
      {!parent && <ContentLanguagePicker />}
      {children}
    </ContentLanguage>
  );
}
