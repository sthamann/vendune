/** Tenant-scoped company workspace; canonical API operations are also exposed through MCP. */
import CompanyCreate from "./CompanyCreate";
import { useB2BExperienceText } from "./experience-i18n";
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../shared/i18n/ContentLanguagePicker";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
import Icon from "../../shared/ui/Icon";
import CoreExtensions from "../../shared/apps/CoreExtensions";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import type { Company, CompanyDetail } from "../../shared/b2b/types";
import EntityHistory from "../../shared/history/EntityHistory";
import Quotes from "./Quotes";
import UnitEditor from "./UnitEditor";
import "../../shared/b2b/b2b.css";
export default function B2BWorkspace({
  request,
  rights,
  onSettings,
}: {
  request: RequestFn;
  rights?: string[];
  onSettings?: () => void;
}) {
  const x = useB2BExperienceText();
  const [feature, setFeature] = useState<
      Parameters<ReturnType<typeof useB2BExperienceText>>[0] | ""
    >(""),
    [creating, setCreating] = useState(false),
    [tab, setTab] = useState<"companies" | "quotes">("companies"),
    [query, setQuery] = useState("");
  const t = useB2BText(),
    { locale } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]),
    [detail, setDetail] = useState<CompanyDetail>(),
    [draft, setDraft] = useState<Company>(),
    [config, setConfig] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState("");
  const canManage = !rights || rights.includes("b2b.manage"),
    canPII = !rights || rights.includes("customers.pii");
  const command = (op: string, v: unknown = {}) => request("/api/b2b/" + op, v);
  const load = async () => {
    const [v, c] = await Promise.all([
      command("companies"),
      command("configuration"),
    ]);
    setCompanies(v.companies);
    setConfig(c);
  };
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void run(load);
  }, [request]);
  const open = async (id: string) => {
    const v = await command("company", { id });
    setDetail(v);
    setDraft(v);
  };
  const save = async () => {
    if (!draft) return;
    await command("company.save", {
      id: draft.id,
      revision: draft.revision,
      data: draft.data,
    });
    await load();
    await open(draft.id);
    setSaved(t("saved"));
  };
  return (
    <div className="studio-page b2b-workspace">
      <header className="b2b-heading">
        <div>
          <span className="b2b-eyebrow">
            <Icon name="people" />
            {t("shortTitle")}
          </span>
          <h1>{t("title")}</h1>
          <p>{t("hint")}</p>
        </div>
        <button
          className="studio-primary"
          disabled={busy || !canManage || !canPII}
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" />
          {t("newCompany")}
        </button>
      </header>
      {error && (
        <div role="alert" className="b2b-notice">
          {error}
        </div>
      )}
      {saved && (
        <div role="status" className="b2b-notice">
          {saved}
        </div>
      )}
      {creating && config && (
        <CompanyCreate
          request={request}
          locales={config.locales}
          mainLocale={config.mainLocale}
          canLink={
            canManage &&
            canPII &&
            (!rights ||
              (rights.includes("customers.read") &&
                rights.includes("customers.write")))
          }
          onCancel={() => setCreating(false)}
          onCreated={async (id) => {
            await load();
            await open(id);
            setCreating(false);
          }}
        />
      )}
      {!draft && (
        <>
          <div className="b2b-feature-grid">
            {(
              [
                "companies",
                "members",
                "budgets",
                "quotes",
                "lists",
                "quickOrder",
                "edi",
                "catalogs",
              ] as const
            ).map((key) => (
              <button
                className="b2b-feature-card"
                key={key}
                onClick={() => {
                  setFeature(key);
                  setTab(key === "quotes" ? "quotes" : "companies");
                }}
              >
                <Icon
                  name={
                    key === "quotes"
                      ? "chat"
                      : key === "members"
                        ? "people"
                        : key === "budgets"
                          ? "card"
                          : key === "edi"
                            ? "code"
                            : key === "catalogs"
                              ? "lock"
                              : "layers"
                  }
                />
                <strong>{x(key)}</strong>
                <small>
                  {key === "companies" ? t("hint") : x(`${key}Hint`)}
                </small>
              </button>
            ))}
          </div>
          {feature && feature !== "quotes" && (
            <aside className="studio-card b2b-feature-guide" role="status">
              <h2>{x(feature)}</h2>
              <p>{x("moduleEntry")}</p>
            </aside>
          )}
          <nav className="workbench-row">
            <button
              aria-pressed={tab === "companies"}
              onClick={() => setTab("companies")}
            >
              {x("companies")} ({companies.length})
            </button>
            {canManage && canPII && config?.features?.quotes !== false && (
              <button
                aria-pressed={tab === "quotes"}
                onClick={() => setTab("quotes")}
              >
                {x("quotes")}
              </button>
            )}
            {onSettings && rights?.includes("settings.read") && (
              <button onClick={onSettings}>{x("openSettings")} ↗</button>
            )}
          </nav>
        </>
      )}
      {tab === "quotes" && canManage && canPII && (
        <Quotes request={request} busy={busy} run={run} />
      )}
      {tab === "companies" &&
        (!draft ? (
          <div className="b2b-company-grid">
            <label className="b2b-company-search">
              {x("search")}
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {companies
              .filter((c) =>
                `${contentText(c.data.name, locale, config?.mainLocale)} ${c.data.vatId} ${c.id}`
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              )
              .map((c) => (
                <button
                  className="b2b-company-card"
                  disabled={!canPII}
                  key={c.id}
                  onClick={() => void run(() => open(c.id))}
                >
                  <div className="b2b-company-icon">
                    <Icon name="people" size={30} />
                  </div>
                  <strong>
                    {contentText(c.data.name, locale, config?.mainLocale)}
                  </strong>
                  <small>{c.data.vatId || c.id}</small>
                  <span>
                    <i
                      className={c.data.active ? "b2b-dot" : "b2b-dot paused"}
                    />
                    {t(c.data.active ? "active" : "pause")}
                    <Icon name="arrow" />
                  </span>
                </button>
              ))}
            {!companies.length && (
              <section className="b2b-empty">
                <Icon name="people" size={46} />
                <p>{t("noCompany")}</p>
              </section>
            )}
          </div>
        ) : (
          config && (
            <ContentLanguage
              locales={config.locales}
              mainLocale={config.mainLocale}
            >
              <section className="b2b-panel">
                <div className="b2b-toolbar">
                  <button
                    onClick={() => {
                      setDraft(undefined);
                      setDetail(undefined);
                    }}
                  >
                    <Icon name="arrow" />
                    {t("back")}
                  </button>
                  <ContentLanguagePicker />
                </div>
                <h2>{t("company")}</h2>
                <div className="b2b-fields">
                  <label>
                    {t("identifier")}
                    <input
                      value={draft.id}
                      disabled={draft.revision > 0 || busy}
                      onChange={(e) =>
                        setDraft({ ...draft, id: e.target.value })
                      }
                    />
                  </label>
                  <LocalizedField
                    label={t("name")}
                    value={draft.data.name}
                    onChange={(name) =>
                      setDraft({ ...draft, data: { ...draft.data, name } })
                    }
                    required
                  />
                  <label>
                    {t("vat")}
                    <input
                      value={draft.data.vatId}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          data: { ...draft.data, vatId: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="b2b-toggle">
                    <input
                      type="checkbox"
                      checked={draft.data.active}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          data: { ...draft.data, active: e.target.checked },
                        })
                      }
                    />
                    {t("active")}
                  </label>
                </div>
                <button
                  className="studio-primary"
                  disabled={busy || !canManage}
                  onClick={() => void run(save)}
                >
                  {t("save")}
                </button>
              </section>
              {detail && (
                <UnitEditor
                  request={request}
                  company={detail}
                  config={config}
                  busy={busy || !canManage}
                  run={run}
                  refresh={() => open(detail.id)}
                />
              )}
              {draft.revision > 0 && (
                <EntityHistory
                  request={request}
                  entity="b2bCompany"
                  id={draft.id}
                  revision={draft.revision}
                  dirty={
                    JSON.stringify(draft.data) !== JSON.stringify(detail?.data)
                  }
                  onRestored={async () => {
                    await open(draft.id);
                    await load();
                  }}
                />
              )}
              {draft.revision > 0 && (
                <CoreExtensions
                  objectId={draft.id}
                  extensions={detail?.extensions}
                  omittedExtensions={detail?.omittedExtensions}
                  request={request}
                />
              )}
              {draft.revision > 0 && (
                <AppSurfaceSlot
                  location="admin.b2b.company"
                  context={{ companyId: draft.id }}
                />
              )}
            </ContentLanguage>
          )
        ))}
    </div>
  );
}
