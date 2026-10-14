/** Native creation contracts: address defaults, reviewed exact totals, no nested forms and guarded cancellation. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import CustomerCreate from "../../src/admin/customers/CustomerCreate";
import OrderCreate from "../../src/admin/orders/OrderCreate";
const address = {
  name: "Test Buyer",
  firstName: "Test",
  lastName: "Buyer",
  street: "Fixture Street 1",
  postalCode: "10115",
  city: "Berlin",
  country: "DE",
};
const groups = [{ id: "consumer", translations: { en: { name: "Retail" } } }];
const options = {
  mainLocale: "en-GB",
  locales: ["en-GB", "de-DE"],
  countries: ["DE"],
  shipping: [{ id: "standard", name: "Delivery", countries: ["DE"] }],
  payments: [
    { id: "invoice", name: "Invoice", mode: "manual" },
    { id: "live", name: "Live provider", mode: "app" },
  ],
};
const customer = {
  id: "customer-one",
  email: "buyer@example.test",
  profile: { name: "Test Buyer", firstName: "Test", lastName: "Buyer" },
  addresses: {
    elements: [{ id: "billing", address }],
    defaultBillingAddressId: "billing",
    defaultShippingAddressId: "billing",
  },
};
const cart = {
  token: "private-cart",
  revision: 3,
  locale: "en-GB",
  lineItems: [
    { id: "tee", label: "Test tee", quantity: 1, price: { totalPrice: 20 } },
  ],
  price: {
    totalPrice: 24,
    totalMinor: "2400",
    positionPrice: 20,
    tax: 3.83,
    currency: "EUR",
  },
  shippingCosts: { totalPrice: 4 },
  legal: { requiresDigital: false },
};
function api() {
  return vi.fn(async (path: string, body?: any) => {
    if (path === "/api/merchant/order-drafts/context")
      return {
        options,
        currencies: {
          availableCurrencies: [{ code: "EUR" }],
          defaultCurrency: "EUR",
        },
        policy: { policyVersion: "policy-one" },
        channels: [{ id: "default", name: { en: "Online" } }],
        customerGroups: groups,
        mainLocale: "en-GB",
      };
    if (path.startsWith("/api/merchant/customers/lookup"))
      return { elements: [customer] };
    if (path.startsWith("/api/merchant/products?"))
      return {
        elements: [
          {
            id: "tee",
            name: "Test tee",
            stock: 5,
            min_purchase: 1,
            purchase_steps: 1,
            media: [],
            options: { size: "M" },
          },
        ],
      };
    if (path === "/api/merchant/customers/buyer%40example.test")
      return customer;
    if (path === "/store-api/countries")
      return { countries: [], mainLocale: "en-GB" };
    if (path === "/api/merchant/order-drafts/review")
      return { cart, policy: { policyVersion: "policy-one" } };
    if (path === "/api/merchant/order-drafts/complete")
      return { id: "order-one" };
    if (path === "/api/merchant/customers") return { email: body.email };
    throw Error(path);
  });
}
it("creates a customer with one reviewed billing/shipping default and no password", async () => {
  const request = api(),
    onCreated = vi.fn(),
    user = userEvent.setup();
  render(
    <CustomerCreate
      request={request}
      countries={["DE"]}
      groups={groups}
      groupName={() => "Retail"}
      onCreated={onCreated}
      onBack={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  await user.type(screen.getByLabelText("Email"), "new@example.test");
  for (const [label, value] of [
    ["First name", "New"],
    ["Last name", "Buyer"],
  ])
    await user.type(screen.getAllByLabelText(label)[0], value);
  for (const [label, value] of [
    ["Street and house number", "Test Street 1"],
    ["Postal code", "10115"],
    ["City", "Berlin"],
  ])
    await user.type(screen.getByLabelText(label), value);
  await user.click(screen.getByRole("button", { name: "Save customer" }));
  await waitFor(() =>
    expect(onCreated).toHaveBeenCalledWith("new@example.test"),
  );
  expect(request).toHaveBeenCalledWith(
    "/api/merchant/customers",
    expect.objectContaining({
      email: "new@example.test",
      shippingAddress: null,
      customerGroup: "consumer",
      billingAddress: expect.objectContaining({
        country: "DE",
        name: "New Buyer",
      }),
    }),
  );
  expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument();
});
it("reviews native prices before an explicitly approved exact-total order command", async () => {
  const request = api(),
    onCreated = vi.fn(),
    user = userEvent.setup();
  render(
    <OrderCreate
      request={request}
      rights={[]}
      onBack={vi.fn()}
      onCreated={onCreated}
    />,
    { wrapper: LocaleProvider },
  );
  await user.click(
    await screen.findByRole("option", { name: /buyer@example.test/ }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Street and house number")).toHaveValue(
      address.street,
    ),
  );
  await user.click(await screen.findByRole("button", { name: /Test tee/ }));
  expect(
    screen.queryByRole("option", { name: "Live provider" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Review order" }));
  expect(
    await screen.findByRole("heading", { name: "Ready for your review" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Create order" })).toBeDisabled();
  await user.click(screen.getByLabelText(/The customer authorized this order/));
  await user.click(screen.getByLabelText(/The customer's acceptance/));
  await user.click(screen.getByRole("button", { name: "Create order" }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith("order-one"));
  expect(request).toHaveBeenCalledWith(
    "/api/merchant/order-drafts/complete",
    expect.objectContaining({
      cartToken: "private-cart",
      revision: 3,
      totalMinor: "2400",
      approve: true,
      policyVersion: "policy-one",
      customerAcknowledgement: true,
    }),
  );
});
it("customer creation inside an order is a separate form and returning preserves selected products", async () => {
  const user = userEvent.setup(),
    request = api();
  const { container } = render(
    <OrderCreate
      request={request}
      rights={["customers.write"]}
      onBack={vi.fn()}
      onCreated={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  await user.click(await screen.findByRole("button", { name: /Test tee/ }));
  await user.click(screen.getByRole("button", { name: "Add customer" }));
  expect(container.querySelectorAll("form")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Back to overview" }));
  expect(
    await screen.findByText("Test tee", { selector: "strong" }),
  ).toBeVisible();
});
