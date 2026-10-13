/** Native UI controls preserve language inheritance, explicit destructive confirmation and current grants. */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import CompanyLists from "../../src/storefront/account/CompanyLists";
import CompanyPurchasing from "../../src/storefront/account/CompanyPurchasing";
import UnitCatalog from "../../src/admin/b2b/UnitCatalog";
import UnitMethods from "../../src/admin/b2b/UnitMethods";
import Members from "../../src/admin/b2b/Members";
vi.mock("../../src/shared/apps/AppSurfaces", () => ({
  AppSurfaceSlot: () => null,
}));
vi.mock("../../src/shared/api/shop-api", async (original) => ({
  ...(await original<object>()),
  shopApi: (...args: unknown[]) => api(...args),
}));
const api = vi.fn(),
  run = async (fn: () => Promise<void>) => fn(),
  wrapper = LocaleProvider;
const unit: any = {
  name: { "de-DE": "Einkauf" },
  active: true,
  currency: "EUR",
  allowedShipping: ["pickup"],
  allowedPayments: [],
  budgetMinor: null,
  budgetPeriod: "month",
  costCenter: "IT",
  approvalAboveMinor: null,
  restrictedCatalog: false,
  requirePurchaseOrder: false,
};
const cart: any = {
  id: "cart",
  token: "synthetic",
  revision: 3,
  status: "open",
  b2b: {
    unitId: "it",
    purchaseOrder: "PO-REOPEN-7",
    approvalRequired: false,
    budgetAvailable: true,
  },
  lineItems: [{ id: "lamp", label: "Lampe", quantity: 2 }],
  price: { totalPrice: 10, currency: "EUR" },
};
it("keeps one field, a German main name and a fifth-language translation", async () => {
  const command = vi.fn(async () => ({})),
    user = userEvent.setup();
  render(
    <CompanyLists
      lists={[]}
      cart={cart}
      unit="it"
      customerId="buyer"
      busy={false}
      run={run}
      command={command as any}
      reload={async () => {}}
      onCart={() => {}}
      mainLocale="de-DE"
      locales={["en-GB", "de-DE", "es-ES", "fr-FR", "it-IT"]}
    />,
    { wrapper },
  );
  const picker = screen.getByRole("combobox");
  await user.selectOptions(picker, "de-DE");
  await user.type(screen.getByLabelText("Name your order list"), "Lampen");
  await user.selectOptions(picker, "it-IT");
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(screen.getByLabelText("Name your order list")).toHaveAttribute(
    "placeholder",
    "Lampen",
  );
  await user.type(screen.getByLabelText("Name your order list"), "Lampade");
  await user.click(
    screen.getByRole("button", { name: "Save current cart as a list" }),
  );
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(
      "list.save",
      expect.objectContaining({
        revision: 0,
        unitId: "it",
        data: {
          name: { "de-DE": "Lampen", "it-IT": "Lampade" },
          shared: false,
          items: [{ id: "lamp", quantity: 2 }],
        },
      }),
    ),
  );
});
it("confirms deletion; a peer list cannot be deleted", async () => {
  const command = vi.fn(async () => ({})),
    user = userEvent.setup();
  const lists = [
    {
      id: "mine",
      ownerId: "buyer",
      revision: 7,
      data: { name: { "en-GB": "Mine" }, shared: false, items: [] },
    },
    {
      id: "peer",
      ownerId: "other",
      revision: 2,
      data: { name: { "en-GB": "Peer" }, shared: true, items: [] },
    },
  ];
  render(
    <CompanyLists
      lists={lists}
      unit="it"
      customerId="buyer"
      busy={false}
      run={run}
      command={command as any}
      reload={async () => {}}
      onCart={() => {}}
      mainLocale="en-GB"
      locales={["en-GB"]}
    />,
    { wrapper },
  );
  expect(screen.getAllByRole("button", { name: "Delete list" })).toHaveLength(
    1,
  );
  await user.click(screen.getByRole("button", { name: "Delete list" }));
  expect(command).not.toHaveBeenCalled();
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete list",
    }),
  );
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith("list.delete", {
      id: "mine",
      unitId: "it",
      revision: 7,
    }),
  );
});
it("uses actual product search and translated native method names", async () => {
  const request = vi.fn(async (_path: string) => ({
      elements: [{ id: "lamp", name: "Studio lamp", productNumber: "SKU-1" }],
    })),
    change = vi.fn(),
    user = userEvent.setup();
  const view = render(
    <UnitCatalog
      request={request}
      ids={[]}
      onChange={change}
      disabled={false}
    />,
    { wrapper },
  );
  await user.type(screen.getByRole("searchbox"), "lamp");
  await user.click(
    await screen.findByRole("button", { name: "Studio lamp · SKU-1" }),
  );
  expect(change).toHaveBeenCalledWith(["lamp"]);
  expect(request.mock.calls.at(-1)?.[0]).toContain("/api/merchant/products?");
  view.unmount();
  render(
    <UnitMethods
      data={unit}
      config={{
        mainLocale: "de-DE",
        shipping: [
          {
            id: "pickup",
            name: "pickup",
            translations: { "de-DE": { name: "Abholung" } },
          },
        ],
        payments: [{ id: "bank", name: "Bank transfer", translations: {} }],
      }}
      onChange={change}
      disabled={false}
    />,
    { wrapper },
  );
  await user.click(screen.getByRole("button", { name: "Abholung" }));
  expect(change).toHaveBeenCalledWith({ allowedShipping: [] });
  await user.click(screen.getByRole("button", { name: "Bank transfer" }));
  expect(change).toHaveBeenCalledWith({ allowedPayments: ["bank"] });
});
it("restores the actual unit and PO while its parent mutation wrapper is busy", async () => {
  api.mockImplementation(async (path: string) =>
    path.endsWith("/contexts")
      ? {
          mainLocale: "de-DE",
          locales: ["de-DE", "it-IT"],
          elements: [
            {
              id: "other",
              companyId: "firm",
              company: { name: { "de-DE": "Firma" } },
              data: { ...unit, name: { "de-DE": "Vertrieb" } },
              member: { permissions: [] },
            },
            {
              id: "it",
              companyId: "firm",
              company: { name: { "de-DE": "Firma" } },
              data: unit,
              member: { permissions: [] },
            },
          ],
        }
      : { elements: [] },
  );
  const mutation = vi.fn();
  render(
    <CompanyPurchasing
      cart={cart}
      onCart={() => {}}
      customerId="buyer"
      busy={true}
      run={mutation}
    />,
    { wrapper },
  );
  await screen.findByRole("option", { name: "Firma · Einkauf" });
  await waitFor(() => {
    expect(screen.getByLabelText("Purchasing unit")).toHaveValue("it");
    expect(screen.getByLabelText("Purchase-order reference")).toHaveValue(
      "PO-REOPEN-7",
    );
  });
  expect(mutation).not.toHaveBeenCalled();
  expect(api).toHaveBeenCalledWith("/store-api/b2b/contexts", {}, "synthetic");
});
it("shows lookup errors and loads existing member grants", async () => {
  const request = vi.fn(async () => {
      throw new Error("Customer lookup unavailable");
    }),
    user = userEvent.setup();
  render(
    <Members
      request={request}
      unit="it"
      members={[
        {
          unitId: "it",
          customerId: "buyer",
          revision: 2,
          email: "buyer@example.test",
          data: {
            active: true,
            permissions: ["approve"],
            approvalAboveMinor: 4000,
          },
        },
      ]}
      busy={false}
      run={run}
      refresh={async () => {}}
    />,
    { wrapper },
  );
  await screen.findByRole("alert");
  await user.click(
    screen.getAllByRole("button", { name: "Grant unit access" })[1],
  );
  expect(screen.getByLabelText("Approve purchases")).toBeChecked();
  expect(screen.getByLabelText("Purchase")).not.toBeChecked();
  expect(screen.getByLabelText("Approval above (minor units)")).toHaveValue(
    4000,
  );
});
