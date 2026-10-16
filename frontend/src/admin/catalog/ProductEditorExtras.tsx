/** Price-tax selection and permission-filtered extension slots attached to the product editor. */
import CoreExtensions, {
  type CoreExtensionData,
} from "../../shared/apps/CoreExtensions";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import TaxClassSelect from "./TaxClassSelect";
import type { RequestFn } from "../shell/studio-types";
import type { ProductDraft } from "./catalog-model";
export default function ProductEditorExtras({
  extensions,
  id,
  tab,
  draft,
  request,
  change,
  selectedApp,
  canWrite = true,
}: {
  extensions?: CoreExtensionData;
  canWrite?: boolean;
  id: string;
  tab: string;
  draft: ProductDraft;
  request: RequestFn;
  change: (draft: ProductDraft) => void;
  selectedApp: boolean;
}) {
  return (
    <>
      {" "}
      {tab === "prices" && (
        <fieldset className="catalog-permission-fields" disabled={!canWrite}>
          <TaxClassSelect
            request={request}
            value={draft.extra.taxClassId ?? ""}
            onChange={(taxClassId) =>
              change({
                ...draft,
                extra: { ...draft.extra, taxClassId: taxClassId || null },
              })
            }
          />
        </fieldset>
      )}
      {id && tab === "general" && (
        <CoreExtensions objectId={id} {...extensions} request={request} />
      )}
      {id && tab === "general" && (
        <AppSurfaceSlot
          location="admin.product.general"
          context={{ productId: id }}
        />
      )}
      {id && !selectedApp && (
        <AppSurfaceSlot location="admin.product" context={{ productId: id }} />
      )}
    </>
  );
}
