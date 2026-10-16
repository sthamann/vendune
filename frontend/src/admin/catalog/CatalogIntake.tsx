/** Merchant source chooser and explicit staged creation reuse native product, media and environment owners. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalogIntakeText } from "../../shared/i18n/catalog-intake-i18n";
import Icon from "../../shared/ui/Icon";
import { useStudio } from "../shell/StudioContext";
import { createStudioRequest } from "../shell/requests";
import {
  csvTemplate,
  readCatalogFile,
  type IntakeMode,
  type IntakePreview,
  type IntakeRow,
} from "./catalog-intake-model";
import CatalogIntakeReview from "./CatalogIntakeReview";
import "../styles/catalog-intake.css";
export default function CatalogIntake({
  initialMode,
  onClose,
}: {
  initialMode: IntakeMode;
  onClose: () => void;
}) {
  const c = useCatalogIntakeText();
  const studio = useStudio();
  const {
    token,
    locale,
    workspace,
    environment,
    access,
    environments,
    liveRequest,
  } = studio;
  const canAi = access.includes("assistant.use");
  const [mode, setMode] = useState<IntakeMode>(canAi ? initialMode : "csv");
  const [stage, setStage] = useState(environment);
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [count, setCount] = useState(3);
  const [preview, setPreview] = useState<IntakePreview>();
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [tax, setTax] = useState("");
  const [images, setImages] = useState(false);
  const [imageConfigured, setImageConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  const revision = useRef(0);
  const scoped = useMemo(
    () => createStudioRequest(token, stage || workspace, locale),
    [token, stage, workspace, locale],
  );
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    return () => {
      alive.current = false;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    let current = true;
    ++revision.current;
    setPreview(undefined);
    setRows([]);
    setImageConfigured(false);
    setTax("");
    if (!stage) return;
    scoped("/api/merchant/catalog/intake")
      .then((v) => {
        if (!alive.current || !current) return;
        const rates = (v.taxes ?? [])
          .map((t: { defaultRate?: number }) => t.defaultRate)
          .filter((r: unknown) => typeof r === "number");
        if (rates.length === 1) setTax(String(rates[0]));
      })
      .catch((e) => {
        if (alive.current && current) setError(e.message);
      });
    scoped("/api/merchant/media/provider")
      .then((v) => {
        if (alive.current && current) setImageConfigured(v.configured);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [scoped, stage]);
  async function file(file?: File) {
    const version = ++revision.current;
    setError("");
    setSource("");
    setFileName("");
    if (!file) return;
    try {
      const text = await readCatalogFile(file);
      if (alive.current && revision.current === version) {
        setSource(text);
        setFileName(file.name);
      }
    } catch {
      if (alive.current && revision.current === version)
        setError(c("fileInvalid"));
    }
  }
  async function prepare() {
    const version = ++revision.current;
    setBusy(true);
    setError("");
    try {
      const value: IntakePreview = await scoped(
        "/api/merchant/catalog/intake",
        {
          mode,
          source,
          count,
          inference: { provider: studio.provider, model: studio.model || null },
        },
      );
      if (!alive.current || revision.current !== version) return;
      setPreview(value);
      setRows(
        value.drafts.map((draft) => ({
          id: crypto.randomUUID(),
          draft,
          selected: true,
        })),
      );
    } catch (e) {
      if (alive.current && revision.current === version)
        setError((e as Error).message);
    } finally {
      if (alive.current && revision.current === version) setBusy(false);
    }
  }
  async function save() {
    if (!preview || !stage) return;
    setBusy(true);
    setError("");
    let next = [...rows];
    try {
      for (const row of rows.filter((r) => r.selected && !r.saved)) {
        if (!alive.current) break;
        let saved = false,
          imageQueued = false,
          rowError: string | undefined;
        try {
          await scoped("/api/merchant/catalog/intake/save", {
            id: row.id,
            approve: true,
            settingsRevision: preview.settingsRevision,
            mainLocale: preview.mainLocale,
            currency: preview.currency,
            taxRate: Number(tax),
            demo: preview.demo,
            draft: row.draft,
          });
          saved = true;
          if (images && preview.demo && alive.current) {
            const product = await scoped(`/api/merchant/products/${row.id}`);
            await scoped(`/api/merchant/products/${row.id}/media/jobs`, {
              revision: product.revision,
              mode: "generate",
              prompt: c("imagePrompt"),
            });
            imageQueued = true;
          }
        } catch (e) {
          rowError = (e as Error).message;
        }
        next = next.map((r) =>
          r.id === row.id ? { ...r, saved, imageQueued, error: rowError } : r,
        );
        if (alive.current) setRows(next);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="catalog-intake-dialog"
      aria-labelledby="catalog-intake-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <span className="kicker">{studio.workspaceName}</span>
          <h2 id="catalog-intake-title">{c("title")}</h2>
        </div>
        <button
          type="button"
          aria-label={c("close")}
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <p>{c("intro")}</p>
      <div className="catalog-intake-stage">
        <label>
          {c("sandbox")}
          <select
            value={stage}
            disabled={busy || !!preview}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">{c("choose")}</option>
            {environments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        {access.includes("environments.manage") && !preview && (
          <button
            type="button"
            className="studio-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const value = await liveRequest("/api/environments", {
                  name: c("title"),
                });
                if (alive.current) {
                  await studio.refreshEnvironments();
                  setStage(value.id);
                }
              } catch (e) {
                if (alive.current) setError((e as Error).message);
              } finally {
                if (alive.current) setBusy(false);
              }
            }}
          >
            <Icon name="plus" size={16} />
            {c("newSandbox")}
          </button>
        )}
      </div>
      {!stage && <p>{c("needSandbox")}</p>}
      {!preview ? (
        <>
          <div className="catalog-intake-modes">
            {(
              [
                ["csv", "table"],
                ["url", "link"],
                ["demo", "spark"],
              ] as const
            ).map(([value, icon]) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                disabled={busy || (value !== "csv" && !canAi)}
                onClick={() => {
                  revision.current++;
                  setMode(value);
                  setSource("");
                  setFileName("");
                  setError("");
                }}
              >
                <Icon name={icon} />
                <span>{c(value)}</span>
              </button>
            ))}
          </div>
          {!canAi && <p>{c("noAi")}</p>}
          {mode === "csv" ? (
            <section className="catalog-intake-source">
              <label>
                {c("csv")}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(e) => {
                    void file(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <p>{c("csvHint")}</p>
              <a
                download="products.csv"
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}
              >
                {c("template")}
              </a>
              {fileName && <p role="status">{fileName}</p>}
            </section>
          ) : (
            <section className="catalog-intake-source">
              <label>
                {c(mode === "demo" ? "brief" : "source")}
                {mode === "url" ? (
                  <input
                    type="url"
                    value={source}
                    maxLength={2000}
                    placeholder={c("urlPlaceholder")}
                    disabled={busy}
                    onChange={(e) => setSource(e.target.value)}
                  />
                ) : (
                  <textarea
                    rows={4}
                    value={source}
                    maxLength={8000}
                    placeholder={c("briefPlaceholder")}
                    disabled={busy}
                    onChange={(e) => setSource(e.target.value)}
                  />
                )}
              </label>
              <p>{c(mode === "demo" ? "demoHint" : "urlHint")}</p>
              <label>
                {c("count")}
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={count}
                  disabled={busy}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
            </section>
          )}
          <button
            type="button"
            className="studio-primary"
            disabled={
              busy ||
              !stage ||
              (!canAi && mode !== "csv") ||
              !source.trim() ||
              !Number.isInteger(count) ||
              count < 1 ||
              count > 10
            }
            onClick={() => void prepare()}
          >
            {c("prepare")}
          </button>
          {busy && <p role="status">{c("preparing")}</p>}
        </>
      ) : (
        <>
          <CatalogIntakeReview
            preview={preview}
            rows={rows}
            setRows={setRows}
            tax={tax}
            setTax={setTax}
            images={images}
            setImages={setImages}
            imageConfigured={imageConfigured}
            busy={busy}
            onSave={() => void save()}
            onOpen={(id) => {
              studio.setEnvironment(stage);
              studio.openEntity(
                "productData",
                id,
                JSON.stringify([workspace, stage]),
              );
              onClose();
            }}
          />
          <button
            type="button"
            className="studio-secondary"
            disabled={busy}
            onClick={() => {
              setPreview(undefined);
              setRows([]);
            }}
          >
            {c("again")}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
