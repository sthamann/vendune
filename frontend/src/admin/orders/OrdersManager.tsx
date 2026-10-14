/** Order operations and native detail navigation; the shared grid owns only list presentation. */
import type { GridCriteria } from "../../shared/grid/types";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import { useEffect, useState } from "react";
import { downloadFile } from "../../shared/api/download";
import OrderCreate from "./OrderCreate";
import { useAdminCreationText } from "../../shared/i18n/admin-creation-i18n";
import OrderDirectory from "./OrderDirectory";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import type { RequestFn } from "../shell/studio-types";
import type { OpenEntity } from "../shell/useEntityNavigation";
import OrderDetail from "./OrderDetail";
export default function OrdersManager({
  request,
  headers,
  initialId,
  onEntity,
  onEntityBack,
}: {
  request: RequestFn;
  headers: Record<string, string>;
  initialId?: string;
  onEntity?: OpenEntity;
  onEntityBack?: () => void;
}) {
  const { n } = useAdminCreationText();
  const [creating, setCreating] = useState(false);
  const [gridCursor, setGridCursor] = useState("");
  const [gridCriteria, setGridCriteria] = useState<GridCriteria>({});
  const { o } = useOperationsText();
  const [selected, setSelected] = useState<string>(),
    [rights, setRights] = useState<string[]>([]),
    [error, setError] = useState("");
  useEffect(() => setSelected(initialId), [initialId]);
  useEffect(() => {
    let current = true;
    setRights([]);
    request("/api/auth/access")
      .then((v) => {
        if (current) setRights(v.permissions);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [request]);
  return (
    <div className="studio-page workbench operations">
      <div className="page-intro">
        <h1>{o("orders")}</h1>
        <p>{o("ordersHint")}</p>
        {!selected &&
          !creating &&
          [
            "orders.write",
            "customers.read",
            "customers.pii",
            "catalog.read",
          ].every((right) => rights.includes(right)) && (
            <button
              className="studio-primary"
              onClick={() => setCreating(true)}
            >
              {n("newOrder")}
            </button>
          )}
      </div>
      {error && <p role="alert">{error}</p>}
      {creating ? (
        <OrderCreate
          request={request}
          rights={rights}
          onBack={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            if (onEntity) onEntity("orders", id);
            else setSelected(id);
          }}
        />
      ) : selected ? (
        <>
          <AppSurfaceSlot
            location="admin.order"
            context={{ orderId: selected }}
          />
          <AppSurfaceSlot
            location="admin.order.general"
            context={{ orderId: selected }}
          />
          <OrderDetail
            id={selected}
            request={request}
            rights={rights}
            onCustomer={(email) => onEntity?.("customers", email)}
            onProduct={(id) => onEntity?.("productData", id)}
            onBack={() =>
              onEntityBack ? onEntityBack() : setSelected(undefined)
            }
            download={(path) => downloadFile(path, headers)}
          />
        </>
      ) : (
        <OrderDirectory
          queryState={{
            criteria: gridCriteria,
            onCriteria: setGridCriteria,
            cursor: gridCursor,
            onCursor: setGridCursor,
          }}
          request={request}
          rights={rights}
          onOpen={(id) => (onEntity ? onEntity("orders", id) : setSelected(id))}
        />
      )}
    </div>
  );
}
