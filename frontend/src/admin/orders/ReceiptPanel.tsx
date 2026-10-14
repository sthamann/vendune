/** Seller configuration and version-bound receipt creation/download. */
import { useCustomerText } from "../../shared/i18n/customer-i18n";

import { useCallback, useEffect, useState } from "react";
import { useShipmentText } from "../../shared/i18n/shipment-i18n";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import type { RequestFn } from "../shell/studio-types";
export default function ReceiptPanel({
  order,
  request,
  canCreate,
  download,
}: {
  order: any;
  request: RequestFn;
  canCreate: boolean;
  download: (p: string) => Promise<void>;
}) {
  const { o, locale } = useOperationsText();
  const shipmentText = useShipmentText();
  const [deliveryIndex, setDeliveryIndex] = useState(0);
  const { c } = useCustomerText();
  const [ready, setReady] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]),
    [kind, setKind] = useState("invoice"),
    [reference, setReference] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const settings = await request("/api/merchant/receipts/settings");
    setReady(!!settings.data.name);
    setReceipts(
      (await request(`/api/merchant/orders/${order.id}/receipts`)).elements,
    );
  }, [request, order.id]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="studio-card">
      <h2>{o("documents")}</h2>
      <p>{o("documentHint")}</p>
      {error && <p role="alert">{error}</p>}
      {canCreate && (
        <>
          <p>{c("sellerSettings")}</p>
          <form
            className="commerce-fields"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                request(`/api/merchant/orders/${order.id}/receipts`, {
                  revision: order.revision,
                  kind,
                  locale: locale.slice(0, 2),
                  requestKey: crypto.randomUUID(),
                  ...(kind === "delivery_note" && order.deliveries.length
                    ? { deliveryIndex }
                    : {}),
                  ...(kind === "cancellation"
                    ? { referenceId: reference }
                    : {}),
                }),
              );
            }}
          >
            <label>
              {o("documents")}
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {["invoice", "delivery_note", "cancellation"].map((k) => (
                  <option key={k} value={k}>
                    {o(k)}
                  </option>
                ))}
              </select>
            </label>
            {kind === "delivery_note" && order.deliveries.length > 0 && (
              <label>
                {shipmentText("package")}
                <select
                  value={deliveryIndex}
                  onChange={(e) => setDeliveryIndex(Number(e.target.value))}
                >
                  {order.deliveries.map((_: unknown, index: number) => (
                    <option key={index} value={index}>
                      {shipmentText("package")} {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === "cancellation" && (
              <label>
                {o("reference")}
                <select
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                >
                  <option value="">—</option>
                  {receipts
                    .filter((r) => r.kind === "invoice")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.number}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <button disabled={busy || !ready} className="studio-primary">
              {o("generate")}
            </button>
          </form>
        </>
      )}
      {receipts.map((r) => (
        <div className="operation-row" key={r.id}>
          <strong>{r.number}</strong>
          <span>
            {o(r.kind)} · {r.locale.toUpperCase()}
          </span>
          <button
            className="studio-secondary"
            onClick={() => run(() => download(r.pdfPath))}
          >
            {o("pdf")}
          </button>
        </div>
      ))}
    </section>
  );
}
