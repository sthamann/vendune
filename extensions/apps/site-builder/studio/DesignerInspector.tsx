/** Visible edit, element, agent and history modes share the same native draft and approval path. */
import { useLayoutEffect, useRef, type ReactNode } from "react";
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
import BlockPalette from "./BlockPalette";
import { useDesignText } from "./design-i18n";
import { useWorkspaceText } from "./workspace-i18n";
import { useBlocks } from "./useBlockEditing";
export type DesignerMode = "edit" | "blocks" | "agent" | "history";
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
  mode,
  onMode,
  onPrepare,
  scopeKey,
}: {
  scopeKey: string;
  setup?: ReactNode;
  d: Designer;
  request: RequestFn;
  rights: string[];
  writable: boolean;
  theme: Theme;
  products: SiteProduct[];
  setShowPages: (value: boolean) => void;
  onPreview: (page: Page | null) => void;
  mode: DesignerMode;
  onMode: (mode: DesignerMode) => void;
  onPrepare: () => Promise<Page | undefined>;
}) {
  const t = useDesignText(),
    w = useWorkspaceText(),
    { mainLocale } = useContentLanguage();
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [mode]);
  const block = d.draft?.content.blocks.find((b) => b.id === d.selected);
  const editing = useBlocks();
  return (
    <aside className="designer-inspector" aria-label={t("tools")}>
      <div className="designer-modes" role="tablist" aria-label={t("tools")}>
        {(["edit", "blocks", "agent", "history"] as const).map((value) => (
          <button
            type="button"
            key={value}
            role="tab"
            aria-selected={mode === value}
            onClick={() => onMode(value)}
          >
            <Icon
              name={
                value === "edit"
                  ? "settings"
                  : value === "blocks"
                    ? "layers"
                    : value === "agent"
                      ? "spark"
                      : "history"
              }
              size={16}
            />
            {w(value)}
          </button>
        ))}
      </div>
      <div
        ref={panel}
        className="designer-panel-scroll"
        role="tabpanel"
        aria-label={w(mode)}
      >
        {setup}
        {mode === "blocks" && (
          <BlockPalette
            elements={d.context?.elements ?? []}
            disabled={
              !writable ||
              !editing?.enabled ||
              (d.draft?.content.blocks.length ?? 0) >= 24
            }
            onAdd={(block) => editing?.insert(block)}
          />
        )}
        {
          <div hidden={mode !== "agent"}>
            <DesignAgent
              key={scopeKey}
              request={request}
              page={d.draft}
              selected={d.selected}
              disabled={!writable || !rights.includes("assistant.use")}
              onPreview={onPreview}
              onPrepare={onPrepare}
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
          </div>
        }
        {mode === "edit" && !d.draft && (
          <div className="designer-welcome">
            <div className="designer-welcome-symbol">
              <Icon name="palette" size={28} />
            </div>
            <h2>{t("nativeHome")}</h2>
            <p>{w("choose")}</p>
            <button
              type="button"
              className="studio-primary"
              disabled={!writable}
              onClick={() => void onPrepare()}
            >
              {w("prepare")}
            </button>
            <button
              type="button"
              className="studio-secondary"
              onClick={() => onMode("agent")}
            >
              <Icon name="spark" size={16} />
              {w("agent")}
            </button>
            <button
              type="button"
              className="studio-secondary"
              onClick={() => setShowPages(true)}
            >
              {w("addPage")}
            </button>
          </div>
        )}
        {mode === "edit" && d.draft && (
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
          </>
        )}
        {mode === "history" && d.draft && (
          <>
            <h2>{w("history")}</h2>
            {rights.includes("apps.read") && (
              <PageHistory
                request={request}
                page={d.draft}
                selected={d.selected}
                disabled={!writable}
                onRestore={(page) => {
                  d.edit(page);
                  onMode("edit");
                }}
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
      </div>
    </aside>
  );
}
