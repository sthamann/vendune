/** Shared design workspace composes the existing preview, palette and inspector with bounded personal panel widths. */
import { useAppPanelSizing, AppPanelHandle } from "./AppPanelSizing";
import { useAppWorkspaceText } from "../../shared/i18n/app-workspace-i18n";
import { useAppStudioText } from "../../shared/i18n/app-studio-i18n";
import type { NativeView } from "../../shared/apps/native/types";
import type { RequestFn } from "../shell/studio-types";
import type { AppStudio } from "./useAppStudio";
import type { useAppPreview } from "./useAppPreview";
import AppViewTabs from "./AppViewTabs";
import AppCanvas from "./AppCanvas";
import AppInspector from "./AppInspector";
import SandboxPreview from "./SandboxPreview";
export default function AppDesignWorkspace({
  studio,
  immediate,
  view,
  selected,
  onSelect,
  onView,
  preview,
  request,
  onLanguages,
  onEditFields,
}: {
  studio: AppStudio;
  immediate: ReturnType<typeof useAppPreview>;
  view?: NativeView;
  selected: string;
  onSelect: (id: string) => void;
  onView: (id: string) => void;
  preview: boolean;
  request: RequestFn;
  onLanguages: (main: string, locales: string[]) => void;
  onEditFields: () => void;
}) {
  const panels = useAppPanelSizing(),
    w = useAppWorkspaceText(),
    { a } = useAppStudioText(),
    m = studio.manifest;
  return (
    <>
      <p className="app-design-guidance">{w("designHint")}</p>
      <AppViewTabs
        manifest={m}
        selected={view?.id}
        mainLocale={studio.mainLocale}
        onSelect={(id) => {
          onView(id);
          onSelect("");
        }}
        onChange={studio.edit}
      />
      {view ? (
        <div className="app-editor-workspace" style={panels.style}>
          {preview && immediate.active && immediate.result ? (
            <SandboxPreview
              key={immediate.result.digest}
              app={immediate.result.app}
              version={immediate.result.version}
              view={
                m.surfaces?.find((s) => s.uiPath === `native/${view.id}`)?.id ??
                view.id
              }
              request={request}
              onLanguages={onLanguages}
            />
          ) : (
            <AppCanvas
              manifest={m}
              view={view}
              selected={selected}
              onSelect={onSelect}
              onChange={studio.edit}
              mainLocale={studio.mainLocale}
              preview={false}
              previewRequest={request}
              paletteWidth={panels.widths.palette}
              onResizePalette={(n) => panels.resize("palette", n)}
              onEditFields={onEditFields}
            />
          )}
          <AppPanelHandle
            side="inspector"
            value={panels.widths.inspector}
            onChange={(n) => panels.resize("inspector", n)}
          />
          <AppInspector
            manifest={m}
            view={view}
            selected={selected}
            onChange={studio.edit}
          />
        </div>
      ) : (
        <p>{a("select")}</p>
      )}
    </>
  );
}
