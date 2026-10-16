/** Contain a workspace render failure and let the user retry without losing the application shell. */
import { Component, type ReactNode } from "react";
import { useLocale } from "../i18n/i18n";
type Props = {
  title: string;
  retryLabel: string;
  children: ReactNode;
  onRetry?: () => void;
};
export default class WorkspaceBoundary extends Component<
  Props,
  { failed: boolean; moduleFailed: boolean }
> {
  state = { failed: false, moduleFailed: false };
  static getDerivedStateFromError(error: unknown) {
    const moduleFailed =
      error instanceof Error &&
      (/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed/i.test(
        error.message,
      ) ||
        error.name === "ChunkLoadError");
    return { failed: true, moduleFailed };
  }
  render() {
    const retry = () => {
      if (this.props.onRetry) this.props.onRetry();
      else if (this.state.moduleFailed) window.location.reload();
      else this.setState({ failed: false, moduleFailed: false });
    };
    if (this.state.moduleFailed) return <ModuleLoadFailure onReload={retry} />;
    if (this.state.failed)
      return (
        <section className="studio-empty" role="alert">
          <h2>{this.props.title}</h2>
          <button className="studio-secondary" onClick={retry}>
            {this.props.retryLabel}
          </button>
        </section>
      );
    return this.props.children;
  }
}

/** A cached module cannot retry its missing URL; explicit reload keeps normal unsaved-change guards in control. */
function ModuleLoadFailure({ onReload }: { onReload: () => void }) {
  const { t } = useLocale();
  return (
    <section className="studio-empty" role="alert">
      <h2>{t("workspaceModuleUnavailable")}</h2>
      <p>{t("workspaceModuleRecovery")}</p>
      <button className="studio-secondary" onClick={onReload}>
        {t("reloadWorkspace")}
      </button>
    </section>
  );
}
