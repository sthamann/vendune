/** Native server-paged order directory supplies the reusable grid with fulfillment columns and current rights. */
import type { GridQueryState } from "../../shared/grid/types";
import { useEffect, useState } from "react";
import { contentText } from "../../shared/i18n/content-language";
import AgenticGrid from "../../shared/grid/AgenticGrid";
import { useGridPage } from "../../shared/grid/useGridPage";
import { useGridText } from "../../shared/grid/grid-i18n";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import type { RequestFn } from "../shell/studio-types";
export default function OrderDirectory({
  request,
  queryState,
  rights,
  onOpen,
}: {
  request: RequestFn;
  queryState?: GridQueryState;
  rights: string[];
  onOpen: (id: string) => void;
}) {
  const { o, locale } = useOperationsText();
  const { g } = useGridText();
  const [mainLocale, setMainLocale] = useState("en-GB");
  const [states, setStates] = useState<
    { id: string; label: Record<string, string> }[]
  >([]);
  useEffect(() => {
    let current = true;
    request("/api/merchant/order-state-machine")
      .then((v) => {
        if (current) {
          setStates(v.effectiveStates ?? v.data?.states ?? []);
          setMainLocale(v.mainLocale ?? "en-GB");
        }
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [request]);
  const stateName = (id: string) => {
    const state = states.find((s) => s.id === id);
    return state ? contentText(state.label, locale, mainLocale) : o(id);
  };
  const page = useGridPage(request, "/api/merchant/orders", {}, queryState);
  const formatDate = (value: string) =>
    value
      ? new Date(value).toLocaleString(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";
  const options = (values: string[]) =>
    values.map((value) => ({
      value,
      label:
        value === "failed"
          ? g("failed")
          : value === "returned"
            ? g("returned")
            : o(value),
    }));
  return (
    <AgenticGrid
      id="orders"
      title={o("orders")}
      {...page}
      onRow={(row) => onOpen(row.id)}
      rowKey={(r) => r.id}
      agent={{
        entity: "orders",
        request,
        enabled:
          rights.includes("assistant.use") &&
          rights.includes("orders.read") &&
          rights.includes("customers.pii"),
      }}
      filters={[
        { key: "customer", label: g("customer") },
        {
          key: "state",
          label: o("state"),
          options: states.map((s) => ({ value: s.id, label: stateName(s.id) })),
        },
        {
          key: "paymentState",
          label: g("payment"),
          options: options([
            "pending",
            "authorized",
            "paid",
            "captured",
            "failed",
            "refunded",
          ]),
        },
        {
          key: "deliveryState",
          label: g("delivery"),
          options: options([
            "open",
            "shipped",
            "delivered",
            "returned",
            "cancelled",
          ]),
        },
        { key: "channelId", label: g("channel") },
        { key: "from", label: g("from"), type: "date" },
        { key: "to", label: g("to"), type: "date" },
      ]}
      columns={[
        {
          id: "number",
          label: g("number"),
          sort: "number",
          render: (r) => (
            <button
              type="button"
              className="agent-grid-link"
              onClick={() => onOpen(r.id)}
            >
              <span className="agent-grid-avatar">#</span>
              <span>
                <strong>{r.orderNumber}</strong>
                <small>{formatDate(r.createdAt)}</small>
              </span>
            </button>
          ),
        },
        {
          id: "customer",
          label: g("customer"),
          sort: "customer",
          render: (r) => (
            <span>
              {r.orderCustomer?.name ||
                r.orderCustomer?.firstName ||
                r.billingAddress?.name ||
                r.customerEmail ||
                "—"}
              <small className="grid-secondary">{r.customerEmail}</small>
            </span>
          ),
        },
        {
          id: "state",
          label: o("state"),
          sort: "state",
          render: (r) => (
            <span className="agent-grid-tag">
              {contentText(
                r.stateLabels?.[r.state] ?? {},
                locale,
                r.stateMainLocale ?? mainLocale,
              ) || stateName(r.state)}
            </span>
          ),
        },
        {
          id: "payment",
          label: g("payment"),
          render: (r) => (
            <span className="agent-grid-tag">
              {o(r.payment?.state ?? "pending")}
            </span>
          ),
        },
        {
          id: "delivery",
          label: g("delivery"),
          render: (r) => (
            <span>
              {[
                ...new Set(
                  (r.deliveries ?? []).map((d: any) => o(d.state ?? "open")),
                ),
              ].join(" · ") || "—"}
            </span>
          ),
        },
        {
          id: "total",
          label: o("orderTotal"),
          sort: "total",
          align: "end",
          render: (r) =>
            new Intl.NumberFormat(locale, {
              style: "currency",
              currency: r.currency ?? r.cart.price.currency ?? "EUR",
            }).format(r.cart.price.totalPrice),
        },
        {
          id: "created",
          label: g("created"),
          sort: "created",
          hidden: true,
          render: (r) => formatDate(r.createdAt),
        },
        {
          id: "channel",
          label: g("channel"),
          hidden: true,
          render: (r) =>
            r.salesChannelId ?? r.cart?.salesChannel ?? r.channel ?? "—",
        },
      ]}
    />
  );
}
