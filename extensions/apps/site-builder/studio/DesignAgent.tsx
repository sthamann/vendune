/** Source-aware alternatives are native proposal tasks; preview and approval are separate explicit actions. */
import { useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Page, PageFields } from "../model";
import { useEditorText } from "./editor-i18n";
import Icon from "../../../../frontend/src/shared/ui/Icon";
type Plan = {
  interpretation: string;
  sources: { url?: string; status: string; digest?: string; note?: string }[];
  variants: { taskId: string; fields: PageFields; summary: string }[];
};
export default function DesignAgent({
  request,
  page,
  selected,
  disabled,
  onPreview,
  onApplied,
}: {
  request: RequestFn;
  page: Page;
  selected: string;
  disabled: boolean;
  onPreview: (page: Page | null) => void;
  onApplied: () => Promise<void>;
}) {
  const t = useEditorText(),
    [instruction, setInstruction] = useState(""),
    [urls, setUrls] = useState(""),
    [images, setImages] = useState<string[]>([]),
    [style, setStyle] = useState(true),
    [structure, setStructure] = useState(false),
    [content, setContent] = useState(false);
  const [plan, setPlan] = useState<Plan>(),
    [index, setIndex] = useState(-1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generate = async () => {
    if (disabled || busy) return;
    setBusy(true);
    setError("");
    setPlan(undefined);
    onPreview(null);
    try {
      const p = await request("/api/merchant/site/plan", {
        id: page.id,
        revision: page.revision,
        instruction,
        selected,
        urls: urls
          .split(/\n/)
          .map((u) => u.trim())
          .filter(Boolean),
        images,
        style,
        structure,
        content,
      });
      setPlan(p);
      setIndex(-1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="designer-agent">
      <summary>
        <Icon name="spark" />
        {t("agent")}
      </summary>
      <label>
        {t("instruction")}
        <textarea
          value={instruction}
          maxLength={2000}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={t("instructionHint")}
        />
      </label>
      <label>
        {t("references")}
        <textarea
          value={urls}
          maxLength={6000}
          onChange={(e) => setUrls(e.target.value)}
        />
      </label>
      <label>
        {t("upload")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])];
            setError("");
            if (files.length > 2 || files.some((f) => f.size > 1048576)) {
              setError(t("upload"));
              return;
            }
            try {
              setImages(
                await Promise.all(
                  files.map(
                    (file) =>
                      new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      }),
                  ),
                ),
              );
            } catch {
              setError(t("upload"));
            }
          }}
        />
      </label>
      {images.map((src, i) => (
        <div key={i} className="designer-reference-image">
          <img src={src} alt={t("references")} width={120} />
          <button
            aria-label={t("discard")}
            onClick={() => setImages(images.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <div className="designer-reference-options">
        {(
          [
            [style, setStyle, "style"],
            [structure, setStructure, "structure"],
            [content, setContent, "content"],
          ] as const
        ).map(([value, set, key]) => (
          <label className="designer-check" key={key}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => set(e.target.checked)}
            />
            {t(key)}
          </label>
        ))}
      </div>
      <button
        disabled={disabled || busy || !instruction.trim()}
        onClick={() => void generate()}
      >
        <Icon name="spark" />
        {t("generate")}
      </button>
      {busy && <p role="status">{t("generating")}</p>}
      {error && <p role="alert">{error}</p>}
      {plan && (
        <div className="designer-variants">
          <p>{plan.interpretation}</p>
          <ul>
            {plan.sources.map((s, i) => (
              <li key={i}>
                {s.url ?? s.digest?.slice(0, 12)} ·{" "}
                {t(
                  s.status === "provided"
                    ? "provided"
                    : s.status === "partial"
                      ? "partial"
                      : "notCaptured",
                )}
                {s.status !== "provided" && (
                  <small>
                    {t(s.status === "partial" ? "partialHint" : "sourceHint")}
                  </small>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setIndex(-1);
              onPreview(null);
            }}
          >
            {t("before")}
          </button>
          {plan.variants.map((variant, i) => (
            <article key={variant.taskId}>
              <p>{variant.summary}</p>
              <button
                aria-pressed={index === i}
                onClick={() => {
                  setIndex(i);
                  onPreview({ ...page, ...variant.fields });
                }}
              >
                {t("after")} {i + 1}
              </button>
              <button
                disabled={disabled || busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await request("/api/merchant/site/apply", {
                      taskId: variant.taskId,
                      approve: true,
                    });
                    setPlan(undefined);
                    onPreview(null);
                    await onApplied();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("apply")}
              </button>
            </article>
          ))}
          <button
            onClick={() => {
              setPlan(undefined);
              onPreview(null);
            }}
          >
            {t("discard")}
          </button>
        </div>
      )}
    </details>
  );
}
