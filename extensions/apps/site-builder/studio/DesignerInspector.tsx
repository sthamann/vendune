/** Contextual properties, AI proposals and history share the designer's single native draft. */
import type { ReactNode } from "react";
import { useContentLanguage } from "../../../../frontend/src/shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../../../frontend/src/shared/i18n/ContentLanguagePicker";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import PrivateFormInbox from "../../../../frontend/src/shared/apps/PrivateFormInbox";
import type { Page, Theme } from "../model";
import type { SiteProduct } from "../Renderer";
import type { Designer } from "./useDesigner";
import PageInspector from "./PageInspector";
import PageHistory from "./PageHistory";
import DesignAgent from "./DesignAgent";
import { useDesignText } from "./design-i18n";
export default function DesignerInspector({
  d,
  request,
  rights,
  writable,
  theme,
  products,
  setShowPages,
  onPreview,
  setup,
}: {
  setup?: ReactNode;
  d: Designer;
  request: RequestFn;
  rights: string[];
  writable: boolean;
  theme: Theme;
  products: SiteProduct[];
  setShowPages: (value: boolean) => void;
  onPreview: (page: Page | null) => void;
}) {
  const t = useDesignText(),
    { mainLocale } = useContentLanguage();
  const block = d.draft?.content.blocks.find((b) => b.id === d.selected);
  return (
    <aside className="designer-inspector" aria-label={t("tools")}>
      {setup}
      {!d.draft && (
        <div className="designer-welcome">
          <Icon name="palette" size={32} />
          <h2>{t("nativeHome")}</h2>
          <p>{t("nativeHint")}</p>
          <p className="designer-scope-hint">{t("sandboxHint")}</p>
          <button
            className="studio-secondary"
            onClick={() => setShowPages(true)}
          >
            {t("addPage")}
          </button>
        </div>
      )}
      {d.draft && (
        <>
          <ContentLanguagePicker />
          <PageInspector
            page={d.draft}
            appearance={theme}
            block={block}
            products={products}
            request={request}
            onSearch={d.search}
            disabled={!writable}
            onChange={d.edit}
            onSelect={d.setSelected}
          />
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
            onPreview={onPreview}
            onApplied={async () => {
              onPreview(null);
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
  );
}
