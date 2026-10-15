/** Built-in and installed-app elements share a visual insertion gallery and one document model. */
import { useState } from "react";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import {
  surfaceLabel,
  type AppSurface,
} from "../../../../frontend/src/shared/apps/AppSurfaces";
import { useContentLanguage } from "../../../../frontend/src/shared/i18n/ContentLanguage";
import { newBlock, type Block, type BlockKind } from "../model";
import { useDesignText } from "./design-i18n";
import { useWorkspaceText } from "./workspace-i18n";
import BlockPreview from "./BlockPreview";
const builtIn = [
  "hero",
  "text",
  "products",
  "image",
  "form",
  "articles",
] as const;
export default function BlockPalette({
  elements,
  disabled,
  onAdd,
}: {
  elements: AppSurface[];
  disabled: boolean;
  onAdd: (block: Block) => void;
}) {
  const [query, setQuery] = useState(""),
    t = useDesignText(),
    w = useWorkspaceText(),
    { language, mainLocale } = useContentLanguage();
  const matches = (label: string) =>
    label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const add = (kind: BlockKind, label: string, element?: AppSurface) => {
    const block = newBlock(kind, mainLocale, label);
    if (element)
      block.extension = { app: element.app, surface: element.surface.id };
    onAdd(block);
  };
  return (
    <div className="designer-palette">
      <div className="designer-panel-heading">
        <Icon name="layers" />
        <div>
          <h2>{w("addElement")}</h2>
          <p>{w("builtIn")}</p>
        </div>
      </div>
      <label className="designer-palette-search">
        <Icon name="search" size={16} />
        <input
          type="search"
          aria-label={w("search")}
          placeholder={w("search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="designer-palette-grid">
        {builtIn
          .filter((kind) => matches(t(kind)))
          .map((kind) => (
            <button
              className="designer-element-card"
              key={kind}
              disabled={disabled}
              onClick={() => add(kind, t(kind))}
            >
              <BlockPreview kind={kind} />
              <span>
                <strong>{t(kind)}</strong>
                <small>{w(`${kind}Hint`)}</small>
              </span>
              <Icon name="plus" size={15} />
            </button>
          ))}
      </div>
      <h3 className="designer-palette-section">{w("fromApps")}</h3>
      {!elements.length && <p className="designer-empty-copy">{w("noApps")}</p>}
      <div className="designer-palette-grid">
        {elements
          .filter((s) => matches(surfaceLabel(s, language)))
          .map((element) => (
            <button
              className="designer-element-card"
              key={`${element.app}:${element.surface.id}`}
              disabled={disabled}
              onClick={() =>
                add("app", surfaceLabel(element, mainLocale), element)
              }
            >
              <BlockPreview
                kind={
                  element.native?.view.blocks.some(
                    (b) => b.kind === "cards" || b.kind === "table",
                  )
                    ? "products"
                    : element.native?.view.blocks.some((b) => b.kind === "form")
                      ? "form"
                      : "text"
                }
              />
              <span>
                <strong>{surfaceLabel(element, language)}</strong>
                <small>
                  {element.app} · {element.version}
                </small>
              </span>
              <Icon name="plus" size={15} />
            </button>
          ))}
      </div>
    </div>
  );
}
