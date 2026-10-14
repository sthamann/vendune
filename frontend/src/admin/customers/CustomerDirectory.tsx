/** Registered and guest contacts share native directory filters and permission-aware grid controls. */
import type { GridQueryState } from "../../shared/grid/types";
import AgenticGrid from "../../shared/grid/AgenticGrid";
import { useGridPage } from "../../shared/grid/useGridPage";
import { useGridAccess } from "../../shared/grid/useGridAccess";
import { useGridText } from "../../shared/grid/grid-i18n";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import type { RequestFn } from "../shell/studio-types";
export default function CustomerDirectory({
  request,
  queryState,
  groups,
  groupName,
  onOpen,
}: {
  request: RequestFn;
  queryState?: GridQueryState;
  groups: any[];
  groupName: (id: string) => string;
  onOpen: (email: string) => void;
}) {
  const { o } = useOperationsText(),
    { g, locale } = useGridText();
  const page = useGridPage(request, "/api/merchant/customers", {}, queryState),
    rights = useGridAccess(request);
  return (
    <AgenticGrid
      id="customers"
      title={o("customers")}
      {...page}
      onRow={(row) => onOpen(row.email)}
      rowKey={(c) => c.email}
      agent={{
        entity: "customers",
        request,
        enabled:
          rights.includes("assistant.use") &&
          rights.includes("customers.read") &&
          rights.includes("customers.pii"),
      }}
      filters={[
        {
          key: "guest",
          label: g("customer"),
          options: [
            { value: "true", label: g("guest") },
            { value: "false", label: g("account") },
          ],
        },
        {
          key: "active",
          label: o("state"),
          options: [
            { value: "true", label: g("active") },
            { value: "false", label: g("inactive") },
          ],
        },
        {
          key: "group",
          label: o("group"),
          options: groups.map((g) => ({ value: g.id, label: groupName(g.id) })),
        },
      ]}
      columns={[
        {
          id: "name",
          label: g("customer"),
          sort: "name",
          render: (r) => (
            <button
              type="button"
              className="agent-grid-link"
              onClick={() => onOpen(r.email)}
            >
              <span className="agent-grid-avatar">
                {String(r.profile?.name || r.email)
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span>
                <strong>{r.profile?.name || r.email}</strong>
                <small>{r.email}</small>
              </span>
            </button>
          ),
        },
        {
          id: "email",
          label: g("email"),
          sort: "email",
          render: (r) => r.email,
        },
        {
          id: "number",
          label: g("number"),
          sort: "number",
          render: (r) => r.customerNumber ?? "—",
        },
        {
          id: "group",
          label: o("group"),
          render: (r) => (
            <span className="agent-grid-tag">
              {r.guest ? g("guest") : groupName(r.customerGroup)}
            </span>
          ),
        },
        { id: "company", label: g("company"), render: (r) => r.company || "—" },
        {
          id: "created",
          label: g("created"),
          sort: "created",
          hidden: true,
          render: (r) =>
            r.createdAt
              ? new Date(r.createdAt).toLocaleDateString(locale)
              : "—",
        },
      ]}
    />
  );
}
