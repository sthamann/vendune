/** Compact, accessible editing controls shared by every rich-text field; extra formatting stays in one menu. */
import type { Editor } from "@tiptap/core";
import { useCatalogText } from "../../i18n/catalog-i18n";
import { useEditorText } from "./editor-i18n";
const glyphs = {
  bullets: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
  numbered: "M9 6h12M9 12h12M9 18h12M3 4v5M2 4h1M2 12h3l-3 5h3",
  image: "M3 3h18v18H3ZM3 16l6-6 5 5 3-3 4 4M16 7h1",
  video: "M3 5h18v14H3ZM10 9l5 3-5 3V9Z",
  link: "m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
  undo: "M4 10h10a6 6 0 0 1 0 12M8 5l-5 5 5 5",
  redo: "M20 10H10a6 6 0 0 0 0 12M16 5l5 5-5 5",
  preview:
    "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm7 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  more: "M4 12h1M11 12h1M18 12h1",
};
function Glyph({ name }: { name: keyof typeof glyphs }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={glyphs[name]} />
    </svg>
  );
}
export default function RichToolbar({
  editor,
  label,
  preview,
  onPreview,
  onMedia,
}: {
  editor: Editor;
  label: string;
  preview: boolean;
  onPreview: () => void;
  onMedia: (kind: "image" | "video" | "link") => void;
}) {
  const { c } = useCatalogText(),
    e = useEditorText();
  return (
    <div className="catalog-rich-toolbar" role="toolbar" aria-label={label}>
      <button
        type="button"
        title={c("bold")}
        aria-label={c("bold")}
        aria-pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </button>
      <button
        type="button"
        title={c("italic")}
        aria-label={c("italic")}
        aria-pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </button>
      <button
        type="button"
        title={c("underline")}
        aria-label={c("underline")}
        aria-pressed={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <u>U</u>
      </button>
      <select
        aria-label={c("heading")}
        value={
          editor.isActive("heading", { level: 2 })
            ? "2"
            : editor.isActive("heading", { level: 3 })
              ? "3"
              : "p"
        }
        onChange={(event) =>
          event.target.value === "p"
            ? editor.chain().focus().setParagraph().run()
            : editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(event.target.value) as 2 | 3 })
                .run()
        }
      >
        <option value="p">{c("paragraph")}</option>
        <option value="2">{c("heading")} 2</option>
        <option value="3">{c("heading")} 3</option>
      </select>
      <button
        type="button"
        title={c("bullets")}
        aria-label={c("bullets")}
        aria-pressed={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <Glyph name="bullets" />
      </button>
      <button
        type="button"
        title={c("numbered")}
        aria-label={c("numbered")}
        aria-pressed={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <Glyph name="numbered" />
      </button>
      <button
        type="button"
        title={c("undo")}
        aria-label={c("undo")}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Glyph name="undo" />
      </button>
      <button
        type="button"
        title={c("redo")}
        aria-label={c("redo")}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Glyph name="redo" />
      </button>
      <details className="rich-toolbar-more">
        <summary aria-label={e("more")} title={e("more")}>
          <Glyph name="more" />
        </summary>
        <div className="rich-toolbar-menu">
          {(["image", "video", "link"] as const).map((kind) => (
            <button key={kind} type="button" onClick={() => onMedia(kind)}>
              <Glyph name={kind} />
              {c(kind)}
            </button>
          ))}
          <button type="button" aria-pressed={preview} onClick={onPreview}>
            <Glyph name="preview" />
            {c("preview")}
          </button>
          {(["quote", "code", "divider", "strike"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                if (kind === "quote")
                  editor.chain().focus().toggleBlockquote().run();
                if (kind === "code")
                  editor.chain().focus().toggleCodeBlock().run();
                if (kind === "divider")
                  editor.chain().focus().setHorizontalRule().run();
                if (kind === "strike")
                  editor.chain().focus().toggleStrike().run();
              }}
            >
              {e(kind)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
