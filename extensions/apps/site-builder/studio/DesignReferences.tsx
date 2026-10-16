/** Discoverable URL and image reference inputs; no external HTML is rendered in the editor. */
import { useRef, useState } from "react";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import { useEditorText } from "./editor-i18n";
import { useInteractionText } from "./interaction-i18n";
import { prepareDesignImage } from "./design-images";
import "./references.css";
export default function DesignReferences({
  urls,
  images,
  onUrls,
  onImages,
  disabled,
  onError,
  onBusy,
  onPrompt,
}: {
  urls: string;
  images: string[];
  onUrls: (value: string) => void;
  onImages: (value: string[]) => void;
  disabled: boolean;
  onError: (value: string) => void;
  onBusy: (value: boolean) => void;
  onPrompt: (value: string) => void;
}) {
  const t = useEditorText(),
    i = useInteractionText();
  const [busy, setBusy] = useState(false),
    [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    active = useRef(0);
  const receive = async (files: File[]) => {
    if (disabled || busy || !files.length) return;
    onError("");
    if (files.length + images.length > 2) {
      onError(i("imageError"));
      return;
    }
    const operation = ++active.current;
    setBusy(true);
    onBusy(true);
    try {
      const values = await Promise.all(files.map(prepareDesignImage));
      if (active.current === operation) onImages([...images, ...values]);
    } catch {
      onError(i("imageError"));
    } finally {
      setBusy(false);
      onBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <section
      className="designer-design-references"
      aria-label={i("referenceTitle")}
    >
      <div className="designer-reference-heading">
        <Icon name="spark" size={18} />
        <h3>{i("referenceTitle")}</h3>
      </div>
      <p>{i("referenceHint")}</p>
      <label className="designer-reference-url">
        <span>
          <Icon name="link" size={15} />
          {t("references")}
        </span>
        <textarea
          value={urls}
          maxLength={6000}
          rows={2}
          placeholder={i("urlPlaceholder")}
          disabled={disabled || busy}
          onChange={(e) => onUrls(e.target.value)}
        />
      </label>
      <small>{i("urlHint")}</small>
      <div
        className={`designer-reference-drop ${over ? "is-over" : ""}`}
        onDragOver={(e) => {
          if (disabled || busy || !e.dataTransfer.types.includes("Files"))
            return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) void receive([...e.dataTransfer.files]);
        }}
      >
        <Icon name="image" size={26} />
        <button
          type="button"
          disabled={disabled || busy || images.length >= 2}
          onClick={() => input.current?.click()}
        >
          {i("uploadDesign")}
        </button>
        <span>{i("dropImages")}</span>
        <input
          ref={input}
          type="file"
          aria-label={i("uploadDesign")}
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          disabled={disabled || busy}
          onChange={(e) => void receive([...(e.target.files ?? [])])}
        />
      </div>
      <small>{i("imageHint")}</small>
      {busy && <p role="status">{i("preparingImages")}</p>}
      {!!images.length && (
        <div className="designer-reference-thumbnails">
          {images.map((src, index) => (
            <figure key={src}>
              <img src={src} alt={`${t("references")} ${index + 1}`} />
              <button
                type="button"
                disabled={disabled || busy}
                aria-label={`${t("discard")} ${index + 1}`}
                onClick={() => onImages(images.filter((_, n) => n !== index))}
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      )}
      <button
        type="button"
        className="designer-reference-brief"
        disabled={disabled || busy}
        onClick={() => onPrompt(i("samplePrompt"))}
      >
        {i("usePrompt")} <span aria-hidden="true">↘</span>
      </button>
    </section>
  );
}
