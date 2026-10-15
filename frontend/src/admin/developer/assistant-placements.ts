/** Multiple assistant placements remain ordinary independent views/models in one immutable package. */
import type { Manifest } from "../../shared/apps/native/types";
import type { AssistantSetup } from "./assistant-model";
import { compile, renameEntity } from "./app-model";
import { assistantText } from "../../shared/i18n/app-assistant-i18n";
const captions = {
  "storefront.header": "globalHeader",
  "storefront.home": "homeSection",
  "checkout.content": "checkoutContent",
  "checkout.summary": "checkoutSummary",
  "cart.summary": "cartSummary",
  "account.overview": "accountOverview",
  "product.detail": "productDetail",
  "storefront.block": "storefrontBlock",
  "storefront.page": "storefrontPage",
} as const;
export function multiPlacementManifest(
  s: AssistantSetup,
  single: (s: AssistantSetup) => Manifest,
): Manifest {
  const locations = [...new Set(s.locations)];
  if (!locations.length || locations.length > 6)
    throw new Error("Choose one to six placements");
  if (locations.length === 1)
    return single({ ...s, location: locations[0], locations: undefined });
  const parts = locations.map((location, index) => {
    const prefix = `area${index + 1}`;
    const m = renameEntity(
      single({ ...s, location, locations: undefined }),
      "entries",
      `${prefix}_content`,
    );
    const title = captions[location as keyof typeof captions];
    m.entities = m.entities.map((e) => ({
      ...e,
      label: title ? assistantText(title) : e.label,
    }));
    m.views = m.views?.map((v) => ({
      ...v,
      id: `${prefix}_${v.id}`,
      blocks: v.blocks.map((b) => ({
        ...b,
        ...(b.kind === "form" && title ? { title: assistantText(title) } : {}),
      })),
    }));
    m.surfaces = m.surfaces?.map((v) => ({
      ...v,
      id: `${prefix}_${v.id}`,
      uiPath: v.uiPath.replace("native/", `native/${prefix}_`),
      label: title ? assistantText(title) : v.label,
    }));
    m.apiRoutes = m.apiRoutes?.map((r) => ({ ...r, path: r.action }));
    return m;
  });
  const first = parts[0];
  return compile({
    ...first,
    permissions: [...new Set(parts.flatMap((p) => p.permissions))],
    entities: parts.flatMap((p) => p.entities),
    views: parts.flatMap((p) => p.views ?? []),
    surfaces: parts.flatMap((p) => p.surfaces ?? []),
    actions: [
      ...new Map(
        parts.flatMap((p) => p.actions ?? []).map((a) => [a.name, a]),
      ).values(),
    ],
    apiRoutes: [
      ...new Map(
        parts
          .flatMap((p) => p.apiRoutes ?? [])
          .map((r) => [r.path + ":" + r.scope, r]),
      ).values(),
    ],
  });
}
