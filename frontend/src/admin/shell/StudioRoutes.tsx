/** StudioRoutes: focused Studio view; state and commands come from the session-scoped controller. */
import { lazy, useCallback } from "react";
import { createStudioRequest } from "./requests";
import { useLocale } from "../../shared/i18n/i18n";
import StudioConversation from "./StudioConversation";

import { AppSurfaceView } from "../../shared/apps/AppSurfaces";
import "../../shared/styles/workbench.css";
import Icon from "../../shared/ui/Icon";
import { downloadFile } from "../../shared/api/download";
const PersonalWorkspace = lazy(() => import("../workspace/PersonalWorkspace"));
const ShopDesigner = lazy(
  () => import("../../../../extensions/apps/site-builder/studio/ShopDesigner"),
);
const B2BWorkspace = lazy(() => import("../b2b/B2BWorkspace"));
const POSWorkspace = lazy(() => import("../pos/POSWorkspace"));
const AppsManager = lazy(() => import("../apps/AppsManager"));
const SalesChannelsWorkspace = lazy(
  () => import("../channels/SalesChannelsWorkspace"),
);
const AutomationView = lazy(() => import("../automation/AutomationView"));
const ProductDataView = lazy(() => import("../catalog/ProductDataView"));
const CustomersManager = lazy(() => import("../customers/CustomersManager"));
const DeveloperView = lazy(() => import("../developer/DeveloperWorkspace"));
const EnvironmentManager = lazy(
  () => import("../environments/EnvironmentManager"),
);
const OrdersManager = lazy(() => import("../orders/OrdersManager"));
const SettingsWorkspace = lazy(() => import("../settings/SettingsWorkspace"));
const StoryfrontView = lazy(
  () => import("../../../../extensions/apps/storyfront/studio/StoryfrontView"),
);
import "../styles/operations.css";
import "../styles/studio.css";
const AccessManager = lazy(() => import("../team/AccessManager"));
import type { Session } from "../team/UsersManager";
const UsersManager = lazy(() => import("../team/UsersManager"));
const AgentsView = lazy(() =>
  import("../agents/AgentsView").then((m) => ({ default: m.AgentsView })),
);
const KnowledgeView = lazy(() =>
  import("../intelligence/KnowledgeView").then((m) => ({
    default: m.KnowledgeView,
  })),
);
const OverviewView = lazy(() =>
  import("../dashboard/OverviewView").then((m) => ({
    default: m.OverviewView,
  })),
);

import { canOpenStudio } from "./permissions";
import { usePermissionText } from "../team/permission-i18n";
import { useStudio } from "./StudioContext";

export default function StudioRoutes() {
  const {
    auth,
    appSurface,
    tab,
    request,
    token,
    environment,
    workspace,
    workspaceName,
    role,
    liveRequest,
    environments,
    refreshEnvironments,
    setEnvironment,
    setWorkspace,
    setWorkspaceName,
    setMessages,
    setId,
    setData,
    connected,
    connectionPending,
    retryConnection,
    data,
    access,
    setSettings,
    selectTab,
    entityTarget,
    openEntity,
    entityBack,
    intent,
    onProduct,
    setPreviewOpen,
    focus,
    onExit,
    nav,
    tabLabel,
    t,
    x,
  } = useStudio();
  const { locale } = useLocale();
  const pt = usePermissionText();
  const sandboxRequest = useCallback(
    (id: string) => createStudioRequest(token, id, locale),
    [token, locale],
  );
  // Keep the conversation draft mounted through session recovery; data workspaces wait for their new scope.
  if (!connected && auth.active)
    return (
      <div
        className="studio-empty"
        role={connectionPending ? "status" : "alert"}
      >
        <Icon name={connectionPending ? "refresh" : "link"} size={32} />
        <p>
          {x(connectionPending ? "loadingWorkspace" : "workspaceLoadFailed")}
        </p>
        {!connectionPending && (
          <button className="studio-primary" onClick={retryConnection}>
            {t("refresh")}
          </button>
        )}
      </div>
    );
  if (!appSurface && !canOpenStudio(tab, access))
    return (
      <div className="studio-empty" role="alert">
        <Icon name="lock" size={32} />
        <p>{pt("noAccess")}</p>
      </div>
    );
  return appSurface ? (
    <AppSurfaceView selected={appSurface} />
  ) : tab === "workspace" ? (
    <PersonalWorkspace />
  ) : tab === "design" ? (
    <ShopDesigner
      request={request}
      workspace={environment || workspace}
      shopName={workspaceName}
      rights={access}
      sandbox={!!environment}
      onEnvironments={() => selectTab("environments")}
      onSandbox={async (id) => {
        await refreshEnvironments();
        setEnvironment(id);
      }}
    />
  ) : tab === "orders" ? (
    <OrdersManager
      initialId={entityTarget?.tab === "orders" ? entityTarget.id : undefined}
      onEntity={openEntity}
      onEntityBack={entityTarget ? entityBack : undefined}
      request={request}
      headers={{
        Authorization: `Bearer ${token}`,
        "x-tenant": environment || workspace,
      }}
    />
  ) : tab === "customers" ? (
    <CustomersManager
      request={request}
      initialEmail={
        entityTarget?.tab === "customers" ? entityTarget.id : undefined
      }
      onEntity={openEntity}
      onEntityBack={entityTarget ? entityBack : undefined}
    />
  ) : tab === "automation" ? (
    <AutomationView
      request={request}
      role={role}
      onChannels={() => selectTab("channels")}
    />
  ) : tab === "b2b" ? (
    <B2BWorkspace
      key={environment || workspace}
      request={request}
      rights={access}
      onSettings={() => {
        const url = new URL(location.href);
        url.searchParams.set("settings", "b2b");
        history.replaceState(null, "", url);
        selectTab("commerce");
      }}
    />
  ) : tab === "pos" ? (
    <POSWorkspace
      key={environment || workspace}
      request={request}
      workspace={environment || workspace}
      onChannels={() => selectTab("channels")}
      onOrder={(id) => openEntity("orders", id)}
      download={(path) =>
        downloadFile(path, {
          Authorization: `Bearer ${token}`,
          "x-tenant": environment || workspace,
        })
      }
    />
  ) : tab === "channels" ? (
    <SalesChannelsWorkspace
      key={environment || workspace}
      request={request}
      workspace={environment || workspace}
      onTeam={() => selectTab("users")}
      onDesign={(id) => {
        const url = new URL(location.href);
        url.searchParams.set("designChannel", id);
        history.replaceState(null, "", url);
        selectTab("design");
      }}
    />
  ) : tab === "productData" ? (
    connected ? (
      <ProductDataView
        canWrite={access.includes("catalog.write")}
        request={request}
        onEntity={openEntity}
        initialId={
          entityTarget?.tab === "productData" ? entityTarget.id : undefined
        }
        onEntityBack={entityTarget ? entityBack : undefined}
      />
    ) : (
      <div className="studio-empty">
        <p>{t("connectFirst")}</p>
        <button className="studio-primary" onClick={() => selectTab("users")}>
          {t("users")}
        </button>
      </div>
    )
  ) : tab === "storyfronts" ? (
    <StoryfrontView
      request={request}
      workspace={environment || workspace}
      rights={access}
    />
  ) : tab === "developers" ? (
    <DeveloperView
      key={workspace}
      workspace={workspace}
      sandboxRequest={sandboxRequest}
      onRefresh={refreshEnvironments}
      onFlows={() => selectTab("automation")}
      request={liveRequest}
      environments={environments}
      role={role}
      rights={access}
    />
  ) : tab === "environments" ? (
    <EnvironmentManager
      initialId={environment}
      request={liveRequest}
      environments={environments}
      onRefresh={refreshEnvironments}
      role={role}
      onSelect={setEnvironment}
      rights={access}
    />
  ) : tab === "users" ? (
    <>
      <UsersManager
        token={token}
        workspace={workspace}
        onSession={(session: Session) => {
          if (session.token) {
            void auth.accept(session);
            return;
          }
          sessionStorage.setItem("rac-user-workspace", session.workspace);
          setWorkspace(session.workspace);
          setWorkspaceName(
            session.workspaces.find((w) => w.id === session.workspace)?.name ??
              session.workspace,
          );
          history.replaceState(null, "", `?shop=${session.workspace}#merchant`);
        }}
        onWorkspace={(id, name) => {
          sessionStorage.setItem("rac-user-workspace", id);
          setWorkspace(id);
          setWorkspaceName(name);
          history.replaceState(null, "", `?shop=${id}#merchant`);
          setMessages([]);
          setId(undefined);
          setData(undefined);
        }}
        onLogout={auth.logout}
      />
      {connected && <AccessManager request={liveRequest} />}
    </>
  ) : tab === "assistant" ? (
    <StudioConversation />
  ) : data ? (
    tab === "apps" ? (
      <AppsManager
        key={environment || workspace}
        request={request}
        token={token}
        role={role}
        rights={access}
      />
    ) : tab === "commerce" ? (
      <SettingsWorkspace
        request={request}
        rights={access}
        onConnections={() => setSettings(true)}
        onTeam={() => selectTab("users")}
        onAutomation={() => selectTab("automation")}
        onB2B={() => selectTab("b2b")}
        onChannels={() => selectTab("channels")}
        onApps={() => selectTab("apps")}
      />
    ) : tab === "overview" ? (
      <OverviewView
        data={data}
        onIntent={intent}
        onProduct={(id) => {
          onProduct(id);
          if (window.matchMedia("(max-width:1024px)").matches)
            setPreviewOpen(true);
        }}
      />
    ) : tab === "knowledge" ? (
      <KnowledgeView
        onEntity={openEntity}
        focus={focus}
        data={data}
        request={request}
        onIntent={intent}
        onProduct={(id) => {
          onProduct(id);
          setPreviewOpen(true);
        }}
      />
    ) : (
      <AgentsView data={data} onStorefront={onExit} />
    )
  ) : (
    <div className="studio-empty">
      <Icon name={nav.find((n) => n.id === tab)!.icon} size={48} />
      <h1>{tabLabel(tab)}</h1>
      <p>{t("connectFirst")}</p>
      <button className="studio-primary" onClick={() => selectTab("users")}>
        {x("studioSignIn")}
        <Icon name="link" size={18} />
      </button>
    </div>
  );
}
