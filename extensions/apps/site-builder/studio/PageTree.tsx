/** Compact page hierarchy with a graphical creation dialog and stable, permission-bound section ordering. */
import { useState } from "react";
import { useContentLanguage } from "../../../../frontend/src/shared/i18n/ContentLanguage";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import ConfirmDialog from "../../../../frontend/src/shared/ui/ConfirmDialog";
import {
  newPage,
  moveBlock,
  effectivePages,
  type Page,
  type BlockKind,
} from "../model";
import type { Designer } from "./useDesigner";
import { useDesignText } from "./design-i18n";
import { useWorkspaceText } from "./workspace-i18n";
import BlockPreview from "./BlockPreview";
const art: Record<Page["kind"], BlockKind> = {
  page: "text",
  landing: "hero",
  blog: "articles",
  article: "text",
  form: "form",
};
const blockIcon = {
  hero: "frame",
  text: "text",
  products: "box",
  image: "image",
  form: "form",
  articles: "layers",
  app: "agents",
} as const;
export default function PageTree({
  d,
  writable,
  onOpen: open,
  onHome,
  onAdd,
  onEdit,
}: {
  d: Designer;
  writable: boolean;
  onOpen: (page: Page) => void;
  onHome: () => void;
  onAdd: () => void;
  onEdit: () => void;
}) {
  const t = useDesignText(),
    w = useWorkspaceText(),
    { language, mainLocale } = useContentLanguage();
  const [kind, setKind] = useState<Page["kind"]>("page"),
    [newTitle, setNewTitle] = useState(""),
    [creating, setCreating] = useState(false);
  const visible = effectivePages(d.pages, d.channel).filter(
    (p) => p.status !== "archived",
  );
  return (
    <aside className="designer-tree" aria-label={w("pages")}>
      <header className="designer-tree-header">
        <Icon name="layers" size={18} />
        <h2>{w("pages")}</h2>
        <span>{visible.length || 1}</span>
        <button
          type="button"
          title={w("addPage")}
          aria-label={w("addPage")}
          disabled={!writable}
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" size={17} />
        </button>
      </header>
      <nav className="designer-page-list" aria-label={w("pages")}>
        {!visible.some((p) => p.slug === "home") && (
          <button
            type="button"
            className={`designer-page-row ${!d.draft ? "active" : ""}`}
            onClick={onHome}
          >
            <Icon name="globe" size={17} />
            <span>
              {t("home")}
              <small>{t("nativeHome")}</small>
            </span>
          </button>
        )}
        {visible.map((p) => (
          <button
            type="button"
            className={`designer-page-row ${d.draft?.id === p.id ? "active" : ""}`}
            key={p.id}
            onClick={() => {
              open(p);
              onEdit();
            }}
          >
            <Icon
              name={
                p.slug === "home"
                  ? "globe"
                  : p.kind === "form"
                    ? "form"
                    : p.kind === "blog"
                      ? "layers"
                      : "text"
              }
              size={17}
            />
            <span>
              {contentText(p.title, language, mainLocale)}
              <small>{p.slug === "home" ? t("home") : p.slug}</small>
            </span>
            <i
              className={`designer-page-status status-${p.status}`}
              title={t(p.status)}
            />
          </button>
        ))}
        {d.more && (
          <button type="button" onClick={() => void d.loadMore()}>
            …
          </button>
        )}
      </nav>
      <div className="designer-sections-heading">
        <h3>{w("sections")}</h3>
        <button
          type="button"
          aria-label={w("addElement")}
          title={w("addElement")}
          disabled={!writable || !d.draft}
          onClick={onAdd}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      <div className="designer-section-list">
        {d.draft?.content.blocks.map((b, i) => (
          <div
            className={`designer-tree-block ${d.selected === b.id ? "active" : ""}`}
            key={b.id}
          >
            <button
              type="button"
              aria-pressed={d.selected === b.id}
              onClick={() => {
                d.setSelected(b.id);
                onEdit();
              }}
            >
              <Icon name={blockIcon[b.kind]} size={16} />
              <span>
                {contentText(b.text, language, mainLocale) || t(b.kind)}
              </span>
            </button>
            <div className="designer-reorder">
              <button
                type="button"
                disabled={!writable || !i}
                title={t("up")}
                aria-label={`${t("up")}: ${t(b.kind)}`}
                onClick={() =>
                  d.edit({
                    ...d.draft!,
                    content: {
                      blocks: moveBlock(d.draft!.content.blocks, i, i - 1),
                    },
                  })
                }
              >
                ↑
              </button>
              <button
                type="button"
                disabled={!writable || i === d.draft!.content.blocks.length - 1}
                title={t("down")}
                aria-label={`${t("down")}: ${t(b.kind)}`}
                onClick={() =>
                  d.edit({
                    ...d.draft!,
                    content: {
                      blocks: moveBlock(d.draft!.content.blocks, i, i + 1),
                    },
                  })
                }
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
      {d.draft && (
        <button
          type="button"
          className="designer-add-element"
          disabled={!writable || d.draft.content.blocks.length >= 24}
          onClick={onAdd}
        >
          <Icon name="plus" size={16} />
          {w("addElement")}
        </button>
      )}
      {creating && (
        <ConfirmDialog
          title={w("addPage")}
          confirmLabel={t("addPage")}
          disabled={!writable || !newTitle.trim()}
          onCancel={() => setCreating(false)}
          onConfirm={() => {
            open(newPage(d.channel, mainLocale, newTitle.trim(), kind));
            setNewTitle("");
            setCreating(false);
            onEdit();
          }}
        >
          <div className="designer-page-dialog">
            <label>
              {t("titleField")}
              <input
                value={newTitle}
                maxLength={100}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </label>
            <div className="designer-page-kinds">
              {(["page", "landing", "blog", "article", "form"] as const).map(
                (value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={kind === value}
                    onClick={() => setKind(value)}
                  >
                    <BlockPreview kind={art[value]} />
                    <span>{t(value)}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        </ConfirmDialog>
      )}
    </aside>
  );
}
