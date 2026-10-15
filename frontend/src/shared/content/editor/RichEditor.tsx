/** Actual Tiptap WYSIWYG editor with structured safe content, media, formatting and per-language drafts. */
import { useEffect, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import { useEditorBuffer } from "./EditorBuffer";
import MarkdownSource from "./MarkdownSource";
import { markdownCompatible } from "./markdown-content";
import { useEditorText } from "./editor-i18n";
import "../../styles/markdown-editor.css";
import { Node, mergeAttributes } from "@tiptap/core";
import RichDescription, { type RichBlock } from "../RichDescription";
import { safeRichUrl } from "../rich-document";
import { useCatalogText } from "../../i18n/catalog-i18n";
import { editorTransport } from "./editor-document";
import { editorDocument } from "./rich-conversion";
import RichToolbar from "./RichToolbar";
const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: null }, title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, { controls: true, preload: "metadata" }),
    ];
  },
});
export default function RichEditor({
  value,
  onChange,
  language,
  fallback = "",
  label,
  disabled = false,
}: {
  value: Record<string, RichBlock[]>;
  onChange: (v: Record<string, RichBlock[]>) => void;
  language?: string;
  fallback?: string;
  label?: string;
  disabled?: boolean;
}) {
  const { c, locale } = useCatalogText();
  const e = useEditorText();
  const buffer = useEditorBuffer();
  const [mode, setMode] = useState<"visual" | "markdown">("visual");
  const lang = language ?? locale.slice(0, 2);
  const [media, setMedia] = useState<"image" | "video" | "link" | null>(null);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const editor = useEditor(
    {
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          link: {
            openOnClick: false,
            protocols: ["https"],
            isAllowedUri: (url) => safeRichUrl(url),
          },
        }),
        Image,
        Video,
        Markdown,
      ],
      content: editorDocument(value[lang] ?? [], fallback),
      editorProps: {
        attributes: {
          role: "textbox",
          "aria-label": label ?? c("rich"),
          "aria-multiline": "true",
        },
      },
      onUpdate: ({ editor }) =>
        onChange({
          ...value,
          [lang]: [
            {
              type: "document",
              doc: editorTransport(
                editor.getJSON() as import("../rich-document").RichNode,
              ),
            },
          ],
        }),
    },
    [lang],
  );
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"),
      underline: editor?.isActive("underline"),
      bullets: editor?.isActive("bulletList"),
      numbered: editor?.isActive("orderedList"),
      doc: editor?.getJSON(),
    }),
  });
  useEffect(() => {
    setMedia(null);
    setUrl("");
    setMode("visual");
    setPreview(false);
  }, [lang]);
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.schema || buffer.pending)
      return;
    const target = editor.schema
      .nodeFromJSON(editorDocument(value[lang] ?? [], fallback))
      .toJSON();
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(target)) {
      editor.commands.setContent(target, { emitUpdate: false });
      setMode("visual");
      setPreview(false);
    }
  }, [editor, lang, value, fallback, buffer.pending]);
  if (!editor) return null;
  const compatible = markdownCompatible(editor.getJSON());
  return (
    <div className="catalog-rich">
      <div
        className="catalog-editor-mode"
        role="group"
        aria-label={label ?? c("rich")}
      >
        <button
          type="button"
          disabled={buffer.pending}
          aria-pressed={mode === "visual"}
          onClick={() => setMode("visual")}
        >
          {e("visual")}
        </button>
        <button
          type="button"
          disabled={!compatible}
          aria-pressed={mode === "markdown"}
          onClick={() => setMode("markdown")}
        >
          {e("markdown")}
        </button>
      </div>
      {!compatible && <p className="muted">{e("unsupported")}</p>}
      {mode === "visual" && (
        <RichToolbar
          editor={editor}
          label={label ?? c("rich")}
          preview={preview}
          onPreview={() => setPreview(!preview)}
          onMedia={(kind) => setMedia(media === kind ? null : kind)}
        />
      )}
      {media && mode === "visual" && (
        <div className="catalog-pair">
          <label>
            {c("url")}
            <input value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <button
            type="button"
            className="studio-secondary"
            disabled={!safeRichUrl(url)}
            onClick={() => {
              if (media === "image")
                editor.chain().focus().setImage({ src: url }).run();
              else if (media === "video")
                editor
                  .chain()
                  .focus()
                  .insertContent({ type: "video", attrs: { src: url } })
                  .run();
              else editor.chain().focus().setLink({ href: url }).run();
              setMedia(null);
              setUrl("");
            }}
          >
            {c("add")}
          </button>
        </div>
      )}
      {preview ? (
        <RichDescription
          blocks={[{ type: "document", doc: state?.doc ?? editor.getJSON() }]}
        />
      ) : mode === "markdown" ? (
        <MarkdownSource key={lang} editor={editor} />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
