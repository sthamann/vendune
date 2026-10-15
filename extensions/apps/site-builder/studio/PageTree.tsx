/** Page tree and stable section ordering; all edits go through the shared designer draft. */
import { useState } from "react";
import { useContentLanguage } from "../../../../frontend/src/shared/i18n/ContentLanguage";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import {
  newPage,
  newBlock,
  moveBlock,
  effectivePages,
  type Page,
  type BlockKind,
} from "../model";
import type { Designer } from "./useDesigner";
import { useDesignText } from "./design-i18n";
export default function PageTree({
  d,
  writable,
  onOpen: open,
}: {
  d: Designer;
  writable: boolean;
  onOpen: (page: Page) => void;
}) {
  const t = useDesignText(),
    { language, mainLocale } = useContentLanguage();
  const [kind, setKind] = useState<Page["kind"]>("page"),
    [newTitle, setNewTitle] = useState("");
  const visible = effectivePages(d.pages, d.channel);
  return (
    <aside className="designer-tree">
      <h2>{t("pages")}</h2>
      {visible.map((p) => (
        <button
          className={d.draft?.id === p.id ? "active" : ""}
          key={p.id}
          onClick={() => {
            if (writable && p.channel === "*" && d.channel !== "*") {
              const copy = newPage(d.channel, mainLocale, "", p.kind);
              open({ ...p, id: copy.id, revision: 0, channel: d.channel });
            } else open(p);
          }}
        >
          <Icon
            name={
              p.kind === "blog" || p.kind === "article"
                ? "text"
                : p.kind === "form"
                  ? "form"
                  : "frame"
            }
          />
          <span>
            {contentText(p.title, language, mainLocale)}
            <small>
              {p.slug} · {t(p.status)}
            </small>
          </span>
        </button>
      ))}
      {d.more && <button onClick={() => void d.loadMore()}>…</button>}
      <details>
        <summary>{t("addPage")}</summary>
        <label>
          {t("titleField")}
          <input
            value={newTitle}
            maxLength={100}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </label>
        <select
          aria-label={t("page")}
          value={kind}
          onChange={(e) => setKind(e.target.value as Page["kind"])}
        >
          {(["page", "landing", "blog", "article", "form"] as const).map(
            (k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ),
          )}
        </select>
        <button
          disabled={!writable || !newTitle.trim()}
          onClick={() => {
            const p = newPage(d.channel, mainLocale, newTitle.trim(), kind);
            if (!visible.length && ["page", "landing"].includes(kind))
              p.slug = "home";
            open(p);
            setNewTitle("");
          }}
        >
          {t("addPage")}
        </button>
      </details>
      {d.draft && (
        <>
          <h2>{t("addBlock")}</h2>
          {d.draft.content.blocks.map((b, i) => (
            <div className="designer-tree-block" key={b.id}>
              <button
                aria-pressed={d.selected === b.id}
                onClick={() => d.setSelected(b.id)}
              >
                <Icon
                  name={
                    b.kind === "products"
                      ? "box"
                      : b.kind === "image"
                        ? "image"
                        : b.kind === "form"
                          ? "form"
                          : "text"
                  }
                />
                {t(b.kind)}
              </button>
              <button
                disabled={!writable || !i}
                aria-label={t("up")}
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
                disabled={!writable || i === d.draft!.content.blocks.length - 1}
                aria-label={t("down")}
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
          ))}
          <select
            aria-label={t("addBlock")}
            disabled={!writable || d.draft.content.blocks.length >= 24}
            value=""
            onChange={(e) => {
              const b = newBlock(
                e.target.value as BlockKind,
                mainLocale,
                t(e.target.value as BlockKind),
              );
              d.edit({
                ...d.draft!,
                content: { blocks: [...d.draft!.content.blocks, b] },
              });
              d.setSelected(b.id);
            }}
          >
            <option value="">+ {t("addBlock")}</option>
            {(
              ["hero", "text", "products", "image", "form", "articles"] as const
            ).map((k) => (
              <option value={k} key={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </>
      )}
    </aside>
  );
}
