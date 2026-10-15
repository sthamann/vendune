/** Three-panel standard-shop editor inside the native shell; Storyfront retains its separate original editor. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import {
  ContentLanguage,
  useContentLanguage,
} from "../../../../frontend/src/shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../../../frontend/src/shared/i18n/ContentLanguagePicker";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import AppConsent from "../../../../frontend/src/admin/apps/AppConsent";
import ConfirmDialog from "../../../../frontend/src/shared/ui/ConfirmDialog";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import SiteRenderer from "../Renderer";
import {
  inheritedTheme,
  effectivePages,
  explicitTheme,
  type Page,
} from "../model";
import { useDesignText } from "./design-i18n";
import { useEditorText } from "./editor-i18n";
import useDesigner, { type Designer } from "./useDesigner";
import PageTree from "./PageTree";
import PageInspector from "./PageInspector";
import DesignAgent from "./DesignAgent";
import PrivateFormInbox from "../../../../frontend/src/shared/apps/PrivateFormInbox";
import PageHistory from "./PageHistory";
import usePageProducts from "../usePageProducts";
import "./designer.css";
import "./inspector.css";
type Props = {
  request: RequestFn;
  workspace: string;
  rights: string[];
  sandbox: boolean;
  onEnvironments: () => void;
  onSandbox?: (id: string) => Promise<void>;
};
export default function ShopDesigner(props: Props) {
  const d = useDesigner(props.request, props.workspace);
  return d.context ? (
    <ContentLanguage
      locales={d.context.locales}
      mainLocale={d.context.mainLocale}
    >
      <DesignerView {...props} d={d} />
    </ContentLanguage>
  ) : (
    <section className="studio-page">
      <p role={d.error ? "alert" : "status"}>{d.error || "…"}</p>
      <button onClick={() => void d.load()}>↻</button>
    </section>
  );
}
function DesignerView({
  request,
  workspace,
  rights,
  sandbox,
  onEnvironments,
  onSandbox,
  d,
}: Props & { d: Designer }) {
  const t = useDesignText(),
    e = useEditorText(),
    { language, mainLocale } = useContentLanguage();
  useEffect(() => {
    d.setCatalogueLanguage(language);
  }, [language]);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
      "desktop",
    ),
    [install, setInstall] = useState(false),
    [pending, setPending] = useState<Page>(),
    [pendingChannel, setPendingChannel] = useState<string>(),
    [creating, setCreating] = useState(false);

  const [comparison, setComparison] = useState<Page | null>(null);
  const writable = sandbox && rights.includes("channels.manage"),
    missing = ["site_builder", "site_forms"].find(
      (id) => !d.context!.installed.includes(id),
    );
  const open = (page: Page) => {
    if (d.dirty) setPending(page);
    else d.open(page);
    setComparison(null);
  };
  const createSandbox = async () => {
    if (!onSandbox || creating) return;
    setCreating(true);
    d.setError("");
    try {
      const env = await request("/api/environments", { name: t("title") });
      await onSandbox(env.id);
    } catch (e) {
      d.setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };
  const block = d.draft?.content.blocks.find((b) => b.id === d.selected);
  const theme = {
    ...inheritedTheme(d.pages, d.channel),
    ...explicitTheme(d.draft?.theme),
  };
  const selection = usePageProducts(
    comparison ?? d.draft,
    d.context!.catalogue.elements,
    `${workspace}:${d.channel}:${language}`,
    async (ids) =>
      (
        await request(
          `/api/merchant/site/context?channel=${encodeURIComponent(d.channel)}&locale=${encodeURIComponent(language)}&ids=${encodeURIComponent(JSON.stringify(ids))}`,
        )
      ).catalogue.elements,
  );
  return (
    <div className="shop-designer">
      <header className="designer-heading">
        <div>
          <span className="section-label">{t("title")}</span>
          <h1>{t("title")}</h1>
          <p>{t("hint")}</p>
        </div>
        <label>
          {t("pages")}
          <select
            value={d.channel}
            onChange={(e) => {
              if (d.dirty) setPendingChannel(e.target.value);
              else d.changeChannel(e.target.value);
            }}
          >
            {d.context!.channels.map((c) => (
              <option value={c.id} key={c.id}>
                {contentText(c.data.name, language, mainLocale)}
              </option>
            ))}
            <option value="*">{t("global")}</option>
          </select>
        </label>
      </header>
      {d.error && (
        <p className="designer-error" role="alert">
          {d.error}
        </p>
      )}
      {selection.error && (
        <p className="designer-error" role="alert">
          {e("unavailable")}
        </p>
      )}
      {d.saved && <p role="status">{t("saved")}</p>}
      <div className="designer-toolbar">
        <span className={`designer-scope ${sandbox ? "is-private" : ""}`}>
          <Icon name={sandbox ? "lock" : "globe"} />
          {sandbox ? t("sandbox") : t("readOnly")}
        </span>
        {!sandbox && (
          <button
            disabled={!rights.includes("environments.manage") || creating}
            onClick={() => void createSandbox()}
          >
            {t("sandbox")} ↗
          </button>
        )}
        <button
          disabled={!rights.includes("environments.read")}
          onClick={onEnvironments}
        >
          {t("publish")} ↗
        </button>
      </div>
      <p className="designer-scope-hint">{t("sandboxHint")}</p>
      {missing ? (
        <section className="studio-card designer-setup">
          <Icon name="palette" size={40} />
          <h2>{t("install")}</h2>
          <p>{t("installHint")}</p>
          <button
            className="studio-primary"
            disabled={!rights.includes("apps.manage")}
            onClick={() => setInstall(true)}
          >
            {t("install")}
          </button>
          {install && (
            <AppConsent
              key={missing}
              app={missing}
              request={request}
              onCancel={() => setInstall(false)}
              onInstall={async (consent) => {
                await request("/api/apps", consent);
                await d.load();
                window.dispatchEvent(new Event("commerce.apps.changed"));
              }}
            />
          )}
        </section>
      ) : (
        <div className="designer-layout">
          <PageTree d={d} writable={writable} onOpen={open} />
          <section className="designer-canvas">
            <div className="designer-preview-bar">
              <div role="group" aria-label={t("preview")}>
                {(["desktop", "tablet", "mobile"] as const).map((k) => (
                  <button
                    key={k}
                    aria-pressed={device === k}
                    onClick={() => setDevice(k)}
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
              <button
                aria-label={t("up")}
                disabled={!writable || !d.canUndo}
                onClick={d.undo}
              >
                ↶
              </button>
              <button
                aria-label={t("down")}
                disabled={!writable || !d.canRedo}
                onClick={d.redo}
              >
                ↷
              </button>
            </div>
            {d.draft ? (
              <div className={`designer-device device-${device}`}>
                <SiteRenderer
                  page={comparison ?? d.draft}
                  pages={effectivePages(d.pages, d.channel)}
                  products={selection.products}
                  theme={comparison ? { ...theme, ...comparison.theme } : theme}
                  language={language}
                  mainLocale={mainLocale}
                  channel={d.channel}
                  request={request}
                  selected={d.selected}
                  onSelect={d.setSelected}
                  onInline={
                    writable && !comparison
                      ? (id, text) =>
                          d.edit({
                            ...d.draft!,
                            content: {
                              blocks: d.draft!.content.blocks.map((b) =>
                                b.id === id
                                  ? {
                                      ...b,
                                      text: { ...b.text, [language]: text },
                                    }
                                  : b,
                              ),
                            },
                          })
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="designer-empty">
                <Icon name="palette" size={60} />
                <h2>{t("addPage")}</h2>
                <p>{t("select")}</p>
              </div>
            )}
          </section>
          <aside className="designer-inspector">
            {d.draft && (
              <>
                <ContentLanguagePicker />
                <PageInspector
                  page={d.draft}
                  appearance={theme}
                  block={block}
                  products={selection.products}
                  request={request}
                  onSearch={d.search}
                  disabled={!writable}
                  onChange={d.edit}
                  onSelect={d.setSelected}
                />
                <button
                  className="studio-primary designer-save"
                  disabled={!writable || !d.dirty || d.busy}
                  onClick={() => void d.save()}
                >
                  <Icon name="check" />
                  {t("save")}
                </button>
                <DesignAgent
                  key={`${d.draft.id}:${d.draft.revision}:${d.selected}`}
                  request={request}
                  page={d.draft}
                  selected={d.selected}
                  disabled={
                    !writable ||
                    d.dirty ||
                    !d.draft.revision ||
                    !rights.includes("assistant.use")
                  }
                  onPreview={setComparison}
                  onApplied={async () => {
                    setComparison(null);
                    await d.load();
                    const response = await request(
                      "/api/apps/site_builder/actions/editor_pages",
                      { id: d.draft!.id },
                    );
                    if (response.elements[0]) d.open(response.elements[0]);
                  }}
                />
                {rights.includes("apps.read") && (
                  <PageHistory
                    request={request}
                    page={d.draft}
                    selected={d.selected}
                    disabled={!writable}
                    onRestore={d.edit}
                  />
                )}
                {rights.includes("customers.pii") &&
                  rights.includes("customers.read") && (
                    <PrivateFormInbox
                      key={d.draft.id}
                      request={request}
                      pageId={d.draft.id}
                      mainLocale={mainLocale}
                      labels={Object.fromEntries(
                        d.draft.content.blocks.flatMap((b) =>
                          b.fields.map((f) => [`${b.id}:${f.id}`, f.label]),
                        ),
                      )}
                    />
                  )}
              </>
            )}
          </aside>
        </div>
      )}
      {(pending || pendingChannel !== undefined) && (
        <ConfirmDialog
          title={t("discardTitle")}
          onCancel={() => {
            setPending(undefined);
            setPendingChannel(undefined);
          }}
          onConfirm={() => {
            if (pending) d.open(pending);
            if (pendingChannel !== undefined) d.changeChannel(pendingChannel);
            setPendingChannel(undefined);
            setPending(undefined);
          }}
          confirmLabel={t("discardTitle")}
        >
          <p>{t("discardHint")}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
