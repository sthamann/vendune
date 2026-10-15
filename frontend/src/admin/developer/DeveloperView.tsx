/** Visual App Studio orchestrates modular editors over the same executable schema used by coding agents. */
import { useMemo, useState, useRef, useEffect } from "react";
import type { Environment } from "../environments/EnvironmentManager";
import type { RequestFn } from "../shell/studio-types";
import Icon from "../../shared/ui/Icon";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../shared/i18n/ContentLanguagePicker";
import {
  useAppStudioText,
  type AppStudioKey,
} from "../../shared/i18n/app-studio-i18n";
import { useWorkbenchText } from "../../shared/i18n/workbench-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useAppStudio } from "./useAppStudio";
import { problems } from "./app-model";
import { AppFlowNavigation } from "./AppFlowNavigation";
import AppDesignWorkspace from "./AppDesignWorkspace";
import AppAssistant from "./AppAssistant";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { useAssistantText } from "../../shared/i18n/app-assistant-i18n";
import AppCapabilityEditor from "./AppCapabilityEditor";
import "../styles/app-capability.css";
import AppSettingsEditor from "./AppSettingsEditor";
import AppDataEditor from "./AppDataEditor";
import AppEditorNavigation from "./AppEditorNavigation";
import AppPayments from "./AppPayments";
import AppConnections from "./AppConnections";
import AppAgentDrawer from "./AppAgentDrawer";
import { useAppWorkspaceText } from "../../shared/i18n/app-workspace-i18n";
import AppVersions from "./AppVersions";
import AppLibrary from "./AppLibrary";
import { useAppPreview } from "./useAppPreview";
import AppStudioStatus from "./AppStudioStatus";
import AppStudioIntro from "./AppStudioIntro";
import { useDesignerKeys } from "./useDesignerKeys";
import "../styles/app-studio.css";
import "../styles/app-assistant.css";
import "../styles/app-building.css";
import "../styles/app-studio-inspector.css";
import "../styles/app-studio-panels.css";
import "../styles/app-studio-responsive.css";
import "../styles/app-studio-preview.css";
import "../styles/app-workspace.css";
import "../styles/app-agent-drawer.css";
export default function DeveloperView({
  request,
  environments,
  role,
  sandboxRequest,
  onRefresh,
  onFlows,
  rights,
  homeRevision,
}: {
  request: RequestFn;
  environments: Environment[];
  role: string;
  rights?: string[];
  homeRevision?: number;
  sandboxRequest: (environment: string) => RequestFn;
  onRefresh: () => Promise<void>;
  onFlows: () => void;
}) {
  useEffect(() => {
    if (homeRevision) setAssistant(true);
  }, [homeRevision]);
  const pendingDraft = useRef<(() => void) | null>(null);
  const { t } = useAssistantText();
  const [assistant, setAssistant] = useState(true),
    [replaceDraft, setReplaceDraft] = useState(false);
  const { a, locale } = useAppStudioText(),
    { w } = useWorkbenchText();
  const studio = useAppStudio(request, environments[0]?.id ?? "", onRefresh),
    m = studio.manifest;
  const [agentOpen, setAgentOpen] = useState(false);
  const workspaceText = useAppWorkspaceText();
  const [section, setSection] = useState<AppStudioKey>("design"),
    [viewId, setViewId] = useState("workspace"),
    [selected, setSelected] = useState(""),
    [preview, setPreview] = useState(false),
    [stageName, setStageName] = useState("");
  const [previewLanguages, setPreviewLanguages] = useState<{
    mainLocale: string;
    locales: string[];
  } | null>(null);
  const immediate = useAppPreview(m, request);
  const scoped = useMemo(
    () =>
      sandboxRequest(
        immediate.active && immediate.result
          ? immediate.result.environment
          : studio.env,
      ),
    [
      sandboxRequest,
      studio.env,
      immediate.active,
      immediate.result?.environment,
    ],
  );
  useEffect(() => {
    if (studio.draftStorage.restored) setAssistant(false);
  }, [studio.draftStorage.restored]);
  const view = m.views?.find((v) => v.id === viewId) ?? m.views?.[0];
  const manage = rights
    ? rights.includes("developer.manage")
    : ["owner", "admin"].includes(role);
  const canPreview = immediate.active && !!immediate.result;
  const openForEditing = (build: Parameters<typeof studio.editVersion>[0]) => {
    setAssistant(false);
    studio.editVersion(build);
    setPreview(false);
    immediate.close();
    setSelected("");
    setSection(build.manifest.capability ? "capability" : "design");
  };
  const pureCapability = !!m.capability && !m.views?.length;
  useEffect(() => {
    if (pureCapability) setSection("capability");
  }, [m.id, pureCapability]);
  useDesignerKeys(
    !assistant && manage && !studio.busy,
    immediate.run,
    () => setPreview(true),
    studio.dispatch,
  );
  return (
    <AppFlowNavigation.Provider value={onFlows}>
      <div
        className={`studio-page app-studio ${assistant ? "" : "app-studio-editing"}`}
      >
        <AppStudioIntro
          disabled={!manage || studio.busy}
          onNew={() => {
            setAssistant(true);
            setPreview(false);
            immediate.close();
          }}
          overview={!assistant}
        />
        {assistant && (
          <ContentLanguage
            locales={studio.locales}
            mainLocale={studio.mainLocale}
          >
            <AppAssistant
              onClose={() => setAssistant(false)}
              onCreate={(draft) => {
                const apply = () => {
                  studio.startDraft(draft);
                  setAssistant(false);
                  setPreview(false);
                  setSelected("");
                  setSection("design");
                };
                if (studio.dirty && studio.history.past.length > 0) {
                  pendingDraft.current = apply;
                  setReplaceDraft(true);
                } else apply();
              }}
            />
          </ContentLanguage>
        )}
        {replaceDraft && (
          <ConfirmDialog
            title={t("draftWarning")}
            confirmLabel={t("create")}
            onCancel={() => setReplaceDraft(false)}
            onConfirm={() => {
              pendingDraft.current?.();
              setReplaceDraft(false);
            }}
          >
            <p>{t("draftWarningHint")}</p>
          </ConfirmDialog>
        )}
        {assistant && (
          <AppLibrary
            builds={studio.builds}
            archived={studio.archivedBuilds}
            onArchive={(app, archived) =>
              void studio.run(() => studio.archiveApp(app, archived))
            }
            mainLocale={studio.mainLocale}
            busy={studio.busy || !manage}
            onOpen={openForEditing}
          />
        )}
        {!assistant && (
          <fieldset
            className="app-studio-fieldset"
            disabled={!manage || studio.busy}
          >
            <div className="app-studio-toolbar">
              <div className="app-current">
                <span className="app-logo">
                  <Icon name="layers" size={20} />
                </span>
                <div>
                  <strong>
                    {contentText(m.name, locale, studio.mainLocale) || m.id}
                  </strong>
                  <small>
                    {m.id} · {m.version} ·{" "}
                    {a(
                      studio.draftStorage.pending
                        ? "autosaving"
                        : studio.dirty
                          ? "draftSaved"
                          : "saved",
                    )}
                  </small>
                </div>
              </div>
              <div className="app-toolbar-actions">
                <button
                  type="button"
                  className="studio-secondary app-agent-toggle"
                  aria-haspopup="dialog"
                  aria-expanded={agentOpen}
                  onClick={() => setAgentOpen(true)}
                >
                  <Icon name="spark" size={17} />
                  {workspaceText("agentTitle")}
                </button>
                <button
                  className="studio-secondary"
                  onClick={() => {
                    if (studio.saved) openForEditing(studio.saved);
                    else {
                      setPreview(false);
                      setSection("design");
                    }
                  }}
                >
                  <Icon name="code" size={16} />
                  {a("editApp")}
                </button>
                <label>
                  {a("sandbox")}
                  <select
                    value={studio.env}
                    onChange={(e) => {
                      studio.setEnv(e.target.value);
                      setPreview(false);
                    }}
                  >
                    <option value="">{w("chooseStage")}</option>
                    {environments.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="studio-primary"
                  disabled={!studio.env || problems(m) || !studio.dirty}
                  onClick={() => void studio.run(studio.importVersion)}
                >
                  <Icon name="check" size={16} />
                  {a("saveVersion")}
                </button>
              </div>
            </div>
            {!environments.length && (
              <form
                className="app-new-sandbox"
                onSubmit={(e) => {
                  e.preventDefault();
                  void studio.run(() => studio.createSandbox(stageName));
                }}
              >
                <label>
                  {w("stageName")}
                  <input
                    required
                    maxLength={80}
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                  />
                </label>
                <button className="studio-secondary">{w("newStage")}</button>
              </form>
            )}
            <AppEditorNavigation
              section={section}
              onSelect={(key) =>
                key === "agent" ? setAgentOpen(true) : setSection(key)
              }
              versions={studio.builds.length}
              payments={m.category === "payment" || !!m.paymentProvider}
            />
            <ContentLanguage
              locales={
                preview && canPreview && previewLanguages
                  ? previewLanguages.locales
                  : studio.locales
              }
              mainLocale={
                preview && canPreview && previewLanguages
                  ? previewLanguages.mainLocale
                  : studio.mainLocale
              }
            >
              <div className="app-language-toolbar">
                <ContentLanguagePicker />
                {section === "design" && (
                  <div className="app-canvas-actions">
                    <button
                      className="app-icon-button"
                      disabled={!studio.history.past.length}
                      aria-label={a("undo")}
                      onClick={() => studio.dispatch("undo")}
                    >
                      ↶
                    </button>
                    <button
                      className="app-icon-button"
                      disabled={!studio.history.future.length}
                      aria-label={a("redo")}
                      onClick={() => studio.dispatch("redo")}
                    >
                      ↷
                    </button>
                    <button
                      className="studio-secondary"
                      disabled={immediate.busy || !!problems(m)}
                      aria-pressed={preview && canPreview}
                      onClick={() => {
                        if (preview && canPreview) {
                          setPreview(false);
                          immediate.close();
                        } else {
                          setPreview(true);
                          void immediate.run();
                        }
                      }}
                    >
                      {a(preview && canPreview ? "design" : "realPreview")}
                    </button>
                  </div>
                )}
              </div>
              <AppAgentDrawer
                open={agentOpen}
                onClose={() => setAgentOpen(false)}
                studio={studio}
                request={request}
              />
              {section === "design" && (
                <AppDesignWorkspace
                  studio={studio}
                  immediate={immediate}
                  view={view}
                  selected={selected}
                  onSelect={setSelected}
                  onView={setViewId}
                  preview={preview}
                  request={scoped}
                  onLanguages={(mainLocale, locales) =>
                    setPreviewLanguages({ mainLocale, locales })
                  }
                  onEditFields={() => setSection("data")}
                />
              )}
              {section === "capability" && (
                <AppCapabilityEditor manifest={m} onChange={studio.edit} />
              )}
              {section === "settings" && (
                <AppSettingsEditor manifest={m} onChange={studio.edit} />
              )}
              {section === "data" && (
                <AppDataEditor manifest={m} onChange={studio.edit} />
              )}{" "}
              {section === "connect" && (
                <AppConnections
                  manifest={m}
                  onChange={studio.edit}
                  onFlows={onFlows}
                />
              )}{" "}
              {section === "payments" && (
                <AppPayments
                  manifest={m}
                  onChange={studio.edit}
                  request={request}
                />
              )}
              {section === "versions" && (
                <AppVersions studio={studio} onEdit={openForEditing} />
              )}
            </ContentLanguage>
          </fieldset>
        )}
        <AppStudioStatus studio={studio} preview={immediate} />
      </div>
    </AppFlowNavigation.Provider>
  );
}
