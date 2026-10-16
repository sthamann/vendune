/** Preview composes the shared storefront renderer with editor-only gesture controls. */
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Page, Theme } from "../model";
import { effectivePages } from "../model";
import SiteRenderer, { type SiteProduct } from "../Renderer";
import StorefrontCanvas, { type HomeSnapshot } from "./StorefrontCanvas";
import EditableSection, { DropPosition } from "./EditableSection";
import type { Designer } from "./useDesigner";
export default function DesignerPreview({
  d,
  request,
  workspace,
  shopName,
  language,
  mainLocale,
  device,
  theme,
  products,
  comparison,
  writable,
  onHome,
  onSnapshot,
  onEdit,
}: {
  d: Designer;
  request: RequestFn;
  workspace: string;
  shopName?: string;
  language: string;
  mainLocale: string;
  device: "desktop" | "tablet" | "mobile";
  theme: Theme;
  products: SiteProduct[];
  comparison: Page | null;
  writable: boolean;
  onHome: (snapshot: HomeSnapshot, section: "hero" | "products") => void;
  onSnapshot: (snapshot: HomeSnapshot) => void;
  onEdit: () => void;
}) {
  return (
    <StorefrontCanvas
      key={`${workspace}:${d.channel}:${language}`}
      pageKey={d.draft?.id}
      request={request}
      workspace={workspace}
      shopName={shopName}
      channel={d.channel}
      language={language}
      device={device}
      appearance={d.draft ? theme : undefined}
      products={d.context!.catalogue.elements}
      onHome={onHome}
      onSnapshot={onSnapshot}
    >
      {d.draft ? (
        <div>
          <SiteRenderer
            page={comparison ?? d.draft}
            pages={effectivePages(d.pages, d.channel)}
            products={products}
            theme={comparison ? { ...theme, ...comparison.theme } : theme}
            language={language}
            mainLocale={mainLocale}
            channel={d.channel}
            request={request}
            decorate={
              !comparison
                ? (block, index, section) => (
                    <EditableSection
                      key={block.id}
                      block={block}
                      index={index}
                      count={d.draft!.content.blocks.length}
                      selected={d.selected === block.id}
                    >
                      {section}
                    </EditableSection>
                  )
                : undefined
            }
            trailing={
              !comparison ? (
                <DropPosition at={d.draft.content.blocks.length} />
              ) : undefined
            }
            selected={d.selected}
            onSelect={(id) => {
              d.setSelected(id);
              onEdit();
            }}
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
  );
}
