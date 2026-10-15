/** Three-panel standard-shop editor inside the native shell; Storyfront retains its separate original editor. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import {
  ContentLanguage,
  useContentLanguage,
} from "../../../../frontend/src/shared/i18n/ContentLanguage";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import AppConsent from "../../../../frontend/src/admin/apps/AppConsent";
import ConfirmDialog from "../../../../frontend/src/shared/ui/ConfirmDialog";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import SiteRenderer from "../Renderer";
import { homeDraft } from "./home-draft";
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
import usePageProducts from "../usePageProducts";
import DesignerInspector from "./DesignerInspector";
import StorefrontCanvas, { type HomeSnapshot } from "./StorefrontCanvas";
import "./designer.css";
import "./canvas.css";
import "./inspector.css";
type Props = {
  request: RequestFn;
  workspace: string;
  shopName?: string;
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
  shopName,
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
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(() =>
      window.matchMedia("(max-width: 650px)").matches ? "mobile" : "desktop",
    ),
    [showPages, setShowPages] = useState(false),
    [install, setInstall] = useState(false),
    [pending, setPending] = useState<Page>(),
    [pendingChannel, setPendingChannel] = useState<string>(),
    [pendingHome, setPendingHome] = useState(false),
    [creating, setCreating] = useState(false);

  const [comparison, setComparison] = useState<Page | null>(null);
  useEffect(() => setComparison(null), [workspace, d.channel, request]);
  const writable =
      sandbox &&
      rights.includes("channels.manage") &&
      d.context!.installed.includes("site_builder"),
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
  useEffect(() => {
    if (!d.loaded || d.draft) return;
    const pages = effectivePages(d.pages, d.channel);
    const home = pages.find(
      (p) => p.slug === "home" && p.status !== "archived",
    );
    if (home) d.open(home);
  }, [d.loaded, d.pages, d.channel, d.draft]);
  const customizeHome = (
    snapshot: HomeSnapshot,
    section: "hero" | "products",
  ) => {
    if (d.draft) return;
    if (!sandbox) {
      void createSandbox();
      return;
    }
    if (missing) {
      setInstall(true);
      return;
    }
    if (!writable) {
      d.setError(t("readOnly"));
      return;
    }
    const page = homeDraft(
      d.channel,
      mainLocale,
      language,
      d.context!.catalogue.elements,
      snapshot,
    );
    d.open(page);
    d.setSelected(
      section === "hero"
        ? page.content.blocks[0].id
        : page.content.blocks[1].id,
    );
  };
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
  const setup = missing ? (
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
  ) : null;
  return (
    <div className="shop-designer">
      <header className="designer-heading">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("hint")}</p>
        </div>
        <label>
          {t("channel")}
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
        {d.draft && (
          <button
            className="studio-primary"
            disabled={!writable || !d.dirty || d.busy}
            onClick={() => void d.save()}
          >
            <Icon name="check" />
            {t("save")}
          </button>
        )}
        <button
          disabled={!rights.includes("environments.read")}
          onClick={onEnvironments}
        >
          {t("publish")} ↗
        </button>
      </div>
      <p className="designer-scope-hint">
        {d.draft && sandbox ? t("draftHint") : t("previewHint")}
      </p>

      <div className={`designer-layout ${showPages ? "with-pages" : ""}`}>
        {showPages && (
          <PageTree
            d={d}
            writable={writable}
            onOpen={open}
            onHome={() => {
              if (d.dirty) setPendingHome(true);
              else d.close();
            }}
          />
        )}
        <section className="designer-canvas">
          <div className="designer-preview-bar">
            <button
              aria-expanded={showPages}
              onClick={() => setShowPages(!showPages)}
            >
              <Icon name="menu" size={16} />
              {t("pagesToggle")}
            </button>
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
              aria-label={t("undo")}
              disabled={!writable || !d.canUndo}
              onClick={d.undo}
            >
              ↶
            </button>
            <button
              aria-label={t("redo")}
              disabled={!writable || !d.canRedo}
              onClick={d.redo}
            >
              ↷
            </button>
          </div>
          <StorefrontCanvas
            key={`${workspace}:${d.channel}:${language}`}
            request={request}
            workspace={workspace}
            shopName={shopName}
            channel={d.channel}
            language={language}
            device={device}
            appearance={d.draft ? theme : undefined}
            products={d.context!.catalogue.elements}
            onHome={customizeHome}
          >
            {d.draft ? (
              <div>
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
            ) : null}
          </StorefrontCanvas>
        </section>
        <DesignerInspector
          d={d}
          request={request}
          rights={rights}
          writable={writable}
          theme={theme}
          products={selection.products}
          setShowPages={setShowPages}
          setup={setup}
          onPreview={setComparison}
        />
      </div>
      {(pending || pendingHome || pendingChannel !== undefined) && (
        <ConfirmDialog
          title={t("discardTitle")}
          onCancel={() => {
            setPending(undefined);
            setPendingHome(false);
            setPendingChannel(undefined);
          }}
          onConfirm={() => {
            if (pending) d.open(pending);
            if (pendingHome) d.close();
            setPendingHome(false);
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
