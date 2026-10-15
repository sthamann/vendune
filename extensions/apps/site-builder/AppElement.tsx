/** Placed native app surfaces use the existing public registry, renderer and server-bound read-only preview grants. */
import {
  AppSurfaceView,
  useAppRegistry,
} from "../../../frontend/src/shared/apps/AppSurfaces";
import type { Block } from "./model";
import { useWorkspaceText } from "./studio/workspace-i18n";
export default function AppElement({
  element,
  channel,
  preview,
}: {
  element: NonNullable<Block["extension"]>;
  channel: string;
  preview: boolean;
}) {
  const registry = useAppRegistry(),
    t = useWorkspaceText();
  const surface = registry.public
    ? registry.surfaces.find(
        (s) =>
          s.app === element.app &&
          s.surface.id === element.surface &&
          s.surface.location === "storefront.block" &&
          !!s.native,
      )
    : undefined;
  if (!surface)
    return preview ? (
      <p role="status" className="site-element-unavailable">
        {t("unavailable")}
      </p>
    ) : null;
  return (
    <div className="site-app-element">
      {preview && (
        <small className="site-element-preview-label">{t("appPreview")}</small>
      )}
      <div inert={preview}>
        <AppSurfaceView
          selected={surface}
          context={{ salesChannelId: channel === "*" ? "default" : channel }}
          preview={preview}
          bare
        />
      </div>
    </div>
  );
}
