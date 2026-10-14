/** CRM list and editable customer profile with linked order history. */
import type { GridCriteria } from "../../shared/grid/types";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import CustomerCreate from "./CustomerCreate";
import { useAdminCreationText } from "../../shared/i18n/admin-creation-i18n";
import CustomerDirectory from "./CustomerDirectory";
import GuestContact from "./GuestContact";
import AddressBook from "../../shared/customer/AddressBook";
import CustomerFields from "../../shared/customer/CustomerFields";
import { useCustomerText } from "../../shared/i18n/customer-i18n";
import "../../shared/styles/customers.css";

import { useEffect, useState } from "react";
import EntityHistory from "../../shared/history/EntityHistory";
import { useCrmText } from "../../shared/i18n/crm-i18n";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { inheritedText } from "../../shared/geography/geography-types";
import type { OpenEntity } from "../shell/useEntityNavigation";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import type { RequestFn } from "../shell/studio-types";
export default function CustomersManager({
  request,
  initialEmail,
  onEntity,
  onEntityBack,
}: {
  request: RequestFn;
  initialEmail?: string;
  onEntity?: OpenEntity;
  onEntityBack?: () => void;
}) {
  const { n } = useAdminCreationText();
  const [creating, setCreating] = useState(false);
  const [gridCursor, setGridCursor] = useState("");
  const [gridCriteria, setGridCriteria] = useState<GridCriteria>({});
  const { o } = useOperationsText();
  const { c } = useCustomerText();
  const { r, locale } = useCrmText();
  const [groups, setGroups] = useState<any[]>([]),
    [mainLocale, setMainLocale] = useState("en-GB"),
    [baseline, setBaseline] = useState(""),
    [pending, setPending] = useState<(() => void) | null>(null);
  const [countries, setCountries] = useState<string[]>(["DE"]);
  const [customer, setCustomer] = useState<any>(),
    [canEdit, setCanEdit] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const editable = canEdit && customer?.guest !== true;
  const dirty =
    !!customer &&
    JSON.stringify([
      customer.profile,
      customer.company,
      customer.customerGroup,
      customer.active,
    ]) !== baseline;
  const navigate = (action: () => void) => {
    if (dirty) setPending(() => action);
    else action();
  };
  useEffect(() => {
    request("/store-api/checkout/options")
      .then((v) => setCountries(v.countries))
      .catch((e) => setError(e.message));
    request("/api/auth/access")
      .then(async (v) => {
        setCanEdit(v.permissions.includes("customers.write"));
        if (v.permissions.includes("customers.write")) {
          const context = await request(
            "/api/merchant/customers/create-context",
          );
          setGroups(context.elements ?? []);
          setCountries(context.countries ?? ["DE"]);
          setMainLocale(context.mainLocale);
        } else if (v.permissions.includes("settings.read")) {
          const context = await request("/api/merchant/customer-groups");
          setGroups(context.elements ?? []);
          setMainLocale(context.mainLocale);
        }
      })
      .catch((e) => setError(e.message));
  }, [request]);
  const detail = async (email: string) => {
    try {
      const next = await request(
        `/api/merchant/customers/${encodeURIComponent(email)}`,
      );
      setCustomer(next);
      setBaseline(
        JSON.stringify([
          next.profile,
          next.company,
          next.customerGroup,
          next.active,
        ]),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    if (initialEmail) void detail(initialEmail);
    else setCustomer(undefined);
  }, [initialEmail]);
  const groupName = (id: string) =>
    inheritedText(
      groups.find((g) => g.id === id)?.translations ?? {},
      locale,
      mainLocale,
      "name",
    ) || id;
  return (
    <div className="studio-page workbench operations">
      <div className="page-intro">
        <h1>{o("customers")}</h1>
        <p>{o("customersHint")}</p>
        {!customer && !creating && canEdit && (
          <button className="studio-primary" onClick={() => setCreating(true)}>
            {n("newCustomer")}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {creating ? (
        <CustomerCreate
          key={mainLocale}
          request={request}
          countries={countries}
          groups={groups}
          groupName={groupName}
          onBack={() => setCreating(false)}
          onCreated={(email) => {
            setCreating(false);
            if (onEntity) onEntity("customers", email);
            else void detail(email);
          }}
        />
      ) : customer ? (
        <>
          <button
            className="studio-secondary"
            onClick={() => {
              navigate(() => {
                if (onEntityBack) onEntityBack();
                else {
                  setCustomer(undefined);
                }
              });
            }}
          >
            {onEntityBack ? r("back") : o("back")}
          </button>
          <section className="studio-card">
            <div className="customer-heading">
              <div>
                <small>
                  {customer.guest
                    ? r("guest")
                    : `${c("customerNumber")} · ${customer.customerNumber}`}
                </small>
                <h2>{customer.profile.name || customer.email}</h2>
                <p>{customer.email}</p>
              </div>
              <span className="operation-status">
                {customer.guest
                  ? r("guest")
                  : o(customer.active ? "active" : "inactive")}
              </span>
            </div>
            {!customer.guest && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await request(
                      `/api/merchant/customers/${encodeURIComponent(customer.email)}`,
                      {
                        revision: customer.revision,
                        profile: customer.profile,
                        company: customer.company || null,
                        customerGroup: customer.customerGroup,
                        active: customer.active,
                      },
                      "PUT",
                    );
                    await detail(customer.email);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <CustomerFields
                  value={{
                    ...customer.profile,
                    company: customer.company ?? "",
                  }}
                  disabled={!editable}
                  onChange={(p) =>
                    setCustomer({ ...customer, profile: p, company: p.company })
                  }
                />
                <label>
                  {o("group")}
                  <select
                    disabled={!editable}
                    value={customer.customerGroup}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        customerGroup: e.target.value,
                      })
                    }
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {groupName(g.id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={customer.active}
                    onChange={(e) =>
                      setCustomer({ ...customer, active: e.target.checked })
                    }
                  />
                  {o("active")}
                </label>
                {editable && (
                  <button disabled={busy} className="studio-primary">
                    {o("save")}
                  </button>
                )}
              </form>
            )}
            {dirty && <p className="muted">{r("addressPending")}</p>}
            {customer.guest ? (
              <GuestContact customer={customer} />
            ) : (
              <AddressBook
                request={request}
                path={`/api/merchant/customers/${encodeURIComponent(customer.email)}/addresses`}
                countries={countries}
                canEdit={editable && !dirty && !busy}
                onChange={() => void detail(customer.email)}
              />
            )}
            {customer.orders && (
              <>
                <h3>{o("orders")}</h3>
                {customer.orders.map((r: any) => (
                  <button
                    type="button"
                    className="operation-row"
                    key={r.id}
                    onClick={() => navigate(() => onEntity?.("orders", r.id))}
                  >
                    <strong>{r.orderNumber}</strong>
                    <span>{o(r.state)}</span>
                    <span>
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: r.currency ?? "EUR",
                      }).format(r.cart.price.totalPrice)}
                    </span>
                  </button>
                ))}
              </>
            )}
            {!customer.guest && (
              <AppSurfaceSlot
                location="admin.customer"
                context={{ customerId: customer.id }}
              />
            )}
            {!customer.guest && (
              <EntityHistory
                request={request}
                entity="customer"
                id={customer.email}
                revision={customer.revision}
                dirty={dirty || busy}
                onRestored={() => detail(customer.email)}
              />
            )}
          </section>
        </>
      ) : (
        <CustomerDirectory
          queryState={{
            criteria: gridCriteria,
            onCriteria: setGridCriteria,
            cursor: gridCursor,
            onCursor: setGridCursor,
          }}
          request={request}
          groups={groups}
          groupName={groupName}
          onOpen={(email) =>
            onEntity ? onEntity("customers", email) : void detail(email)
          }
        />
      )}
      {pending && (
        <ConfirmDialog
          title={r("pending")}
          confirmLabel={r("discard")}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            pending();
            setPending(null);
          }}
        >
          <p>{r("dirty")}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
