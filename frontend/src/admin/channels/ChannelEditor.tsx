/** Guided channel creation/editing reuses the native revisioned API and shared content-language inheritance. */
import ChannelReview from "./ChannelReview";
import ChannelLaunch from "./ChannelLaunch";
import ChannelActions from "./ChannelActions";
import ChannelConnections from "./ChannelConnections";
import ChannelCatalog from "./ChannelCatalog";
import { useLifecycleText } from "../automation/lifecycle-i18n";
import { useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { Category } from "../catalog/catalog-model";
import { type Channel } from "./channel-model";
import { useChannelText } from "./channel-i18n";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../shared/i18n/ContentLanguagePicker";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import EntityHistory from "../../shared/history/EntityHistory";
import ChannelVisibility from "./ChannelVisibility";
import ChannelType from "./ChannelType";
import ChannelSettings from "./ChannelSettings";
export default function ChannelEditor({
  initial,
  request,
  languages,
  mainLocale,
  categories,
  countries,
  workspace,
  canWrite,
  onBack,
  onSaved,
  onDeleted,
  onMarketplace,
}: {
  initial: Channel;
  request: RequestFn;
  languages: string[];
  mainLocale: string;
  categories: Category[];
  countries: string[];
  workspace: string;
  canWrite: boolean;
  onBack: () => void;
  onSaved: (channel: Channel) => void;
  onDeleted?: () => void;
  onMarketplace?: () => void;
}) {
  const life = useLifecycleText();
  const t = useChannelText(),
    { locale } = useLocale();
  const [wasNew] = useState(initial.revision === 0);
  const [draft, setDraft] = useState(initial),
    [baseline, setBaseline] = useState(JSON.stringify(initial)),
    [step, setStep] = useState(0),
    [language, setLanguage] = useState(initial.revision ? locale : mainLocale),
    [attempted, setAttempted] = useState(false),
    [selected, setSelected] = useState(initial.data.productIds.length > 0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(false),
    [scope, setScope] = useState(false),
    [connections, setConnections] = useState(false),
    [scopeDirty, setScopeDirty] = useState(false),
    [confirm, setConfirm] = useState<"back" | "active" | null>(null);
  const confirmKey =
    confirm === "back"
      ? "discard"
      : draft.data.active
        ? "deactivate"
        : "activate";
  const dirty = JSON.stringify(draft) !== baseline || scopeDirty;
  const patch = (v: Partial<Channel["data"]>) => {
    setNotice(false);
    setError("");
    setDraft({ ...draft, data: { ...draft.data, ...v } });
  };
  const missing = {
    name: !contentText(draft.data.name, mainLocale, mainLocale).trim(),
    country: draft.data.kind === "pos" && !draft.data.pos?.country,
    languages: !draft.data.locales.length,
    products: selected && !draft.data.productIds.length,
  };
  const valid = !Object.values(missing).some(Boolean);
  const validate = (part: number) => {
    setAttempted(true);
    const field =
      part === 0
        ? missing.name
          ? "nameRequired"
          : missing.country
            ? "countryRequired"
            : null
        : missing.languages
          ? "languagesRequired"
          : missing.products
            ? "productsRequired"
            : null;
    if (field) {
      setError("");
      if (field === "nameRequired") setLanguage(mainLocale);
      return false;
    }
    setAttempted(false);
    setError("");
    return true;
  };
  const save = async (next = draft) => {
    setBusy(true);
    setError("");
    try {
      const result = await request(
        `/api/automation/channels/${encodeURIComponent(next.id)}`,
        { revision: next.revision, data: next.data },
        "PUT",
      );
      const saved = { ...next, revision: result.revision };
      setDraft(saved);
      setBaseline(JSON.stringify(saved));
      setNotice(true);
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (wasNew && draft.revision > 0 && notice)
    return (
      <ChannelLaunch
        channel={draft}
        mainLocale={mainLocale}
        onEdit={() => setNotice(false)}
        onMarketplace={onMarketplace}
      />
    );
  return (
    <ContentLanguage
      locales={languages}
      mainLocale={mainLocale}
      language={language}
      onLanguageChange={setLanguage}
    >
      <section className="studio-card channel-editor">
        <header className="channel-editor-heading">
          <button
            className="studio-secondary"
            disabled={busy}
            onClick={() => (dirty ? setConfirm("back") : onBack())}
          >
            ← {t("back")}
          </button>
          <div>
            <h2>
              {contentText(draft.data.name, locale, mainLocale) || t("new")}
            </h2>
            {draft.revision > 0 && <code>{draft.id}</code>}
          </div>
          <ContentLanguagePicker />
        </header>
        {draft.revision > 0 && (
          <nav className="workbench-row">
            <button
              className={
                !scope && !connections ? "studio-primary" : "studio-secondary"
              }
              disabled={scopeDirty}
              onClick={() => {
                setScope(false);
                setConnections(false);
              }}
            >
              {t("basics")}
            </button>
            <button
              className={scope ? "studio-primary" : "studio-secondary"}
              disabled={busy || JSON.stringify(draft) !== baseline}
              onClick={() => {
                setScope(true);
                setConnections(false);
              }}
            >
              {t("scope")}
            </button>
            <button
              className={connections ? "studio-primary" : "studio-secondary"}
              disabled={
                dirty ||
                busy ||
                ["pos", "marketplace"].includes(draft.data.kind)
              }
              onClick={() => {
                setScope(false);
                setConnections(true);
              }}
            >
              {t("connections")}
            </button>
            <ChannelActions
              draft={draft}
              request={request}
              workspace={workspace}
              disabled={!canWrite || dirty || busy}
              onToggle={() => setConfirm("active")}
              onDeleted={onDeleted ?? onBack}
              onMarketplace={onMarketplace}
            />
          </nav>
        )}
        {connections ? (
          <ChannelConnections
            mainLocale={mainLocale}
            request={request}
            channel={draft.id}
            disabled={!canWrite || busy}
          />
        ) : scope ? (
          <ChannelSettings
            request={request}
            channel={draft.id}
            canWrite={canWrite}
            onDirty={setScopeDirty}
          />
        ) : (
          <>
            {!draft.revision && (
              <ol className="channel-steps">
                {(["basics", "catalog", "review"] as const).map((k, i) => (
                  <li key={k} aria-current={step === i ? "step" : undefined}>
                    <span>{i + 1}</span> {t(k)}
                  </li>
                ))}
              </ol>
            )}
            <p className="channel-status-hint">
              {t(
                !canWrite
                  ? "readOnly"
                  : draft.revision && !dirty
                    ? "unchanged"
                    : draft.revision
                      ? "editHint"
                      : (
                          [
                            "createHint",
                            "createCatalogHint",
                            "createReviewHint",
                          ] as const
                        )[step],
              )}
            </p>
            <fieldset disabled={!canWrite || busy}>
              {(draft.revision > 0 || step === 0) && (
                <>
                  <ChannelType
                    request={request}
                    draft={draft}
                    patch={patch}
                    countries={countries}
                    countryError={
                      attempted && missing.country
                        ? t("countryRequired")
                        : undefined
                    }
                  />
                  <LocalizedField
                    label={t("name")}
                    value={draft.data.name}
                    onChange={(name) =>
                      patch({ name: name as Record<string, string> })
                    }
                    required
                    error={
                      attempted && missing.name ? t("nameRequired") : undefined
                    }
                    maxLength={100}
                  />
                </>
              )}
              {(draft.revision > 0 || step === 0) &&
                !["pos", "marketplace"].includes(draft.data.kind) && (
                  <ChannelVisibility draft={draft} patch={patch} />
                )}
              {(draft.revision > 0 || step === 1) && (
                <>
                  <ChannelCatalog
                    draft={draft}
                    languages={languages}
                    categories={categories}
                    mainLocale={mainLocale}
                    selected={selected}
                    setSelected={setSelected}
                    patch={patch}
                    request={request}
                    languageError={
                      attempted && missing.languages
                        ? t("languagesRequired")
                        : undefined
                    }
                    productError={
                      attempted && missing.products
                        ? t("productsRequired")
                        : undefined
                    }
                  />
                </>
              )}
              {!draft.revision && step === 2 && (
                <ChannelReview draft={draft} mainLocale={mainLocale} />
              )}
              <footer className="workbench-row">
                {!draft.revision && step > 0 && (
                  <button
                    type="button"
                    className="studio-secondary"
                    onClick={() => setStep(step - 1)}
                  >
                    {t("back")}
                  </button>
                )}
                {!draft.revision && step < 2 ? (
                  <button
                    type="button"
                    className="studio-primary"
                    onClick={() => {
                      if (!validate(step)) return;
                      setStep(step + 1);
                    }}
                  >
                    {t("next")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="studio-primary"
                    disabled={!valid || (!dirty && draft.revision > 0)}
                    onClick={() => {
                      if (validate(0) && validate(1)) void save();
                    }}
                  >
                    {t(draft.revision ? "save" : "new")}
                  </button>
                )}
              </footer>
            </fieldset>
            {draft.revision > 0 && (
              <EntityHistory
                request={request}
                entity="channel"
                id={draft.id}
                revision={draft.revision}
                dirty={dirty || busy}
                onRestored={async () => {
                  const value = (
                    await request("/api/automation")
                  ).channels.find((c: Channel) => c.id === draft.id);
                  if (value) {
                    setDraft(value);
                    setBaseline(JSON.stringify(value));
                    onSaved(value);
                  }
                }}
              />
            )}
          </>
        )}
        {draft.id === "default" && <p>{life("inheritLanguages")}</p>}
        {notice && <p role="status">{t("saved")}</p>}
        {error && <p role="alert">{error}</p>}
        {confirm && (
          <ConfirmDialog
            title={t(confirmKey)}
            confirmLabel={t(confirmKey)}
            disabled={busy}
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              if (confirm === "back") onBack();
              else
                void save({
                  ...draft,
                  data: { ...draft.data, active: !draft.data.active },
                });
              setConfirm(null);
            }}
          >
            <p>{t(confirm === "back" ? "discard" : "deactivateHint")}</p>
          </ConfirmDialog>
        )}
      </section>
    </ContentLanguage>
  );
}
