/** Preview-only controls decorate the actual storefront renderer; the published renderer has no editor UI. */
import { useEffect, useRef, type DragEvent, type ReactNode } from "react";
import type { Block, Page } from "../model";
import { useContentLanguage } from "../../../../frontend/src/shared/i18n/ContentLanguage";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import { useDesignText } from "./design-i18n";
import { useInteractionText } from "./interaction-i18n";
import { useBlocks } from "./useBlockEditing";
export function DropPosition({ at }: { at: number }) {
  const editing = useBlocks(),
    t = useInteractionText();
  if (!editing?.enabled) return null;
  return (
    <div
      className={`designer-drop-position ${editing.dragging ? "accepting" : ""} ${editing.target === at ? "active" : ""}`}
      data-drop-position={at}
      onDragOver={(e) => editing.over(e, at)}
      onDrop={(e) => editing.drop(e, at)}
    >
      <span>{t("dropHere")}</span>
    </div>
  );
}
export default function EditableSection({
  block,
  index,
  count,
  selected,
  children,
}: {
  block: Block;
  index: number;
  count: number;
  selected: boolean;
  children: ReactNode;
}) {
  const editing = useBlocks(),
    t = useDesignText(),
    i = useInteractionText();
  const tools = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected && !editing?.dragging)
      tools.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [selected, editing?.dragging]);
  if (!editing?.enabled) return children;
  const boundary = (e: DragEvent) =>
    index +
    (e.clientY >
    e.currentTarget.getBoundingClientRect().top +
      e.currentTarget.getBoundingClientRect().height / 2
      ? 1
      : 0);
  return (
    <div
      className={`designer-editable-section ${selected ? "selected" : ""}`}
      data-editor-block={block.id}
    >
      <DropPosition at={index} />
      <div
        ref={tools}
        className="designer-section-tools"
        role="group"
        aria-label={`${i("controls")}: ${t(block.kind)}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="designer-drag-handle"
          {...editing.pointer(block, true)}
          draggable
          aria-label={i("dragElement")}
          title={i("dragElement")}
          onDragStart={(e) => editing.begin(e, block, true)}
          onDragEnd={editing.cancel}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M5 3h2v2H5zm6 0h2v2h-2zM5 8h2v2H5zm6 0h2v2h-2zM5 13h2v2H5zm6 0h2v2h-2z" />
          </svg>
        </button>
        <span>{t(block.kind)}</span>
        <button
          type="button"
          disabled={index === 0}
          aria-label={t("up")}
          title={t("up")}
          onClick={() => editing.move(block.id, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={index === count - 1}
          aria-label={t("down")}
          title={t("down")}
          onClick={() => editing.move(block.id, 1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="designer-remove-element"
          aria-label={i("removeElement")}
          title={i("removeElement")}
          onClick={() => editing.remove(block.id)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7" />
          </svg>
        </button>
      </div>
      <div
        onDragOver={(e) => editing.over(e, boundary(e))}
        onDrop={(e) => editing.drop(e, boundary(e))}
      >
        {children}
      </div>
    </div>
  );
}

export function PlacementStatus({ page }: { page?: Page }) {
  const editing = useBlocks(),
    i = useInteractionText(),
    t = useDesignText(),
    { language, mainLocale } = useContentLanguage();
  if (!editing?.dragging || editing.target === null) return null;
  const next = page?.content.blocks[editing.target];
  return (
    <span className="designer-placement-status" role="status">
      {i("dropHere")} ·{" "}
      {next
        ? `${i("before")} ${contentText(next.text, language, mainLocale) || t(next.kind)}`
        : i("atEnd")}
    </span>
  );
}
