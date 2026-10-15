/** Shop design uses the shared agent workspace and existing native proposal/approval owners. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import AgentComposer, {
  type AgentEngine,
} from "../../../../frontend/src/shared/agents/AgentComposer";
import AgentTaskTransfer from "../../../../frontend/src/shared/agents/AgentTaskTransfer";
import type { Page, PageFields } from "../model";
import { useEditorText } from "./editor-i18n";
import { useWorkspaceText } from "./workspace-i18n";
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
  onPrepare,
}: {
  request: RequestFn;
  page?: Page;
  selected: string;
  disabled: boolean;
  onPreview: (page: Page | null) => void;
  onApplied: () => Promise<void>;
  onPrepare: () => Promise<Page | undefined>;
}) {
  const t = useEditorText(),
    w = useWorkspaceText();
  const [instruction, setInstruction] = useState(""),
    [engine, setEngine] = useState<AgentEngine>("platform"),
    [task, setTask] = useState<unknown>(),
    [urls, setUrls] = useState(""),
    [images, setImages] = useState<string[]>([]);
  const [style, setStyle] = useState(true),
    [structure, setStructure] = useState(true),
    [content, setContent] = useState(true),
    [scope, setScope] = useState<"page" | "selected">("page");
  const [plan, setPlan] = useState<Plan>(),
    [index, setIndex] = useState(-1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const latest = useRef(page?.id);
  latest.current = page?.id;
  const prepared = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prepared.current && prepared.current !== page?.id) {
      setPlan(undefined);
      setTask(undefined);
      onPreview(null);
    }
  }, [page?.id]);
  useEffect(() => {
    setPlan(undefined);
    setTask(undefined);
    onPreview(null);
  }, [selected, scope]);
  const generate = async () => {
    if (disabled || busy) return;
    setBusy(true);
    setError("");
    setPlan(undefined);
    onPreview(null);
    try {
      const current = await onPrepare();
      if (!current) return;
      prepared.current = current.id;
      const selectedId = scope === "selected" ? selected : "";
      const input = {
        id: current.id,
        revision: current.revision,
        instruction,
        selected: selectedId,
      };
      const result = await request(
        engine === "platform"
          ? "/api/merchant/site/plan"
          : "/api/merchant/site/task",
        engine === "platform"
          ? {
              ...input,
              urls: urls
                .split(/\n/)
                .map((u) => u.trim())
                .filter(Boolean),
              images,
              style,
              structure,
              content,
            }
          : { ...input, agent: engine },
      );
      if (latest.current && latest.current !== current.id) return;
      if (engine === "platform") {
        setPlan(result);
        setIndex(-1);
      } else setTask(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="designer-agent-workspace">
      <div className="designer-panel-heading">
        <div>
          <h2>{w("agent")}</h2>
          <p>{w("saveFirst")}</p>
        </div>
      </div>
      <AgentComposer
        prompt={instruction}
        onPrompt={setInstruction}
        engine={engine}
        onEngine={setEngine}
        busy={busy}
        disabled={disabled}
        placeholder={t("instructionHint")}
        maxLength={2000}
        onSubmit={() => void generate()}
      >
        {selected && (
          <label>
            {w("scope")}
            <select
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as "page" | "selected")
              }
            >
              <option value="page">{w("wholePage")}</option>
              <option value="selected">{w("selection")}</option>
            </select>
          </label>
        )}
        {engine === "platform" && (
          <details className="designer-agent-references">
            <summary>{w("references")}</summary>
            <label>
              {t("references")}
              <textarea
                value={urls}
                maxLength={6000}
                rows={3}
                onChange={(event) => setUrls(event.target.value)}
              />
            </label>
            <label>
              {t("upload")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={async (event) => {
                  const files = [...(event.target.files ?? [])];
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
                              const r = new FileReader();
                              r.onload = () => resolve(String(r.result));
                              r.onerror = reject;
                              r.readAsDataURL(file);
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
                    onChange={(event) => set(event.target.checked)}
                  />
                  {t(key)}
                </label>
              ))}
            </div>
            {images.map((src, i) => (
              <div key={i} className="designer-reference-image">
                <img src={src} alt={t("references")} width={80} />
                <button
                  type="button"
                  aria-label={t("discard")}
                  onClick={() => setImages(images.filter((_, n) => n !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </details>
        )}
      </AgentComposer>
      {busy && <p role="status">{t("generating")}</p>}
      {error && (
        <p role="alert" className="designer-error">
          {error}
        </p>
      )}
      <AgentTaskTransfer
        task={task}
        name="shop-design-agent-task.json"
        busy={busy}
        disabled={disabled}
        onImport={async (value) => {
          if (disabled || busy) return;
          setBusy(true);
          setError("");
          try {
            if (
              value &&
              typeof value === "object" &&
              "id" in value &&
              value.id !== latest.current
            )
              throw new Error(w("unavailable"));
            const result = await request("/api/merchant/site/propose", value);
            setPlan(result);
            setIndex(-1);
            onPreview(null);
          } finally {
            setBusy(false);
          }
        }}
      />
      {plan && page && (
        <section className="designer-variants">
          <p>{plan.interpretation}</p>
          {!!plan.sources.length && (
            <details>
              <summary>{t("references")}</summary>
              <ul>
                {plan.sources.map((source, i) => (
                  <li key={i}>
                    {source.url ?? source.digest?.slice(0, 12)} ·{" "}
                    {t(
                      source.status === "provided"
                        ? "provided"
                        : source.status === "partial"
                          ? "partial"
                          : "notCaptured",
                    )}
                    {source.status !== "provided" && (
                      <small>
                        {t(
                          source.status === "partial"
                            ? "partialHint"
                            : "sourceHint",
                        )}
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button
            type="button"
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
              <div className="designer-variant-actions">
                <button
                  type="button"
                  aria-pressed={index === i}
                  onClick={() => {
                    setIndex(i);
                    onPreview({ ...page, ...variant.fields });
                  }}
                >
                  {t("after")} {i + 1}
                </button>
                <button
                  type="button"
                  className="studio-primary"
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
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={() => {
              setPlan(undefined);
              onPreview(null);
            }}
          >
            {t("discard")}
          </button>
        </section>
      )}
    </div>
  );
}
