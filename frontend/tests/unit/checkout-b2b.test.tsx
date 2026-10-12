/** Review and separate approval remain coupled to the current native quote. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { cart as base } from "./fixtures";
import type { Cart } from "../../src/shared/api/shop-api";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import CheckoutPanel from "../../src/storefront/checkout/CheckoutPanel";
vi.mock("../../src/storefront/legal/PrivacyProvider", () => ({
  useLegalPolicy: () => ({
    policyVersion: "fixture",
    data: { strictCheckout: false },
  }),
}));
const api = vi.hoisted(() => vi.fn());
vi.mock("../../src/shared/api/shop-api", () => ({ shopApi: api }));
vi.mock("../../src/shared/geography/useCountryCatalogue", () => ({
  useCountryCatalogue: () => undefined,
}));
vi.mock("../../src/shared/apps/AppSurfaces", () => ({
  AppSurfaceSlot: () => null,
}));
function fixture(): Cart {
  const address = {
    name: "Fixture Buyer",
    firstName: "Fixture",
    lastName: "Buyer",
    street: "Test Street 1",
    postalCode: "12345",
    city: "Test",
    country: "DE",
  };
  return {
    ...structuredClone(base),
    checkout: {
      country: "DE",
      shippingMethodId: "standard",
      paymentMethodId: "card",
      customerEmail: "buyer@example.test",
      address,
      billingAddress: address,
    },
    lineItems: [
      {
        id: "lamp",
        label: "Fixture lamp",
        quantity: 1,
        minPurchase: 1,
        purchaseSteps: 1,
        price: { unitPrice: 50, totalPrice: 50 },
      },
    ],
    availableShippingMethods: [
      {
        id: "standard",
        name: "Standard",
        active: true,
        price: 0,
        freeAbove: null,
        minDays: 1,
        maxDays: 3,
        countries: ["DE"],
        taxType: "highest",
      },
    ],
    availablePaymentMethods: [
      {
        id: "card",
        name: "Card",
        active: true,
        businessOnly: false,
        mode: "simulated",
      },
    ],
    price: {
      positionPrice: 50,
      totalPrice: 50,
      netPrice: 42.02,
      tax: 7.98,
      taxStatus: "gross",
    },
    b2b: {
      unitId: "unit",
      purchaseOrder: "PO-1",
      costCenter: "Research",
      budgetAvailable: true,
      approvalRequired: true,
    },
  };
}
function harness(initial = fixture()) {
  const review = vi.fn(),
    buy = vi.fn();
  let current = initial;
  function View() {
    const [cart, setCart] = useState(initial);
    current = cart;
    return (
      <CheckoutPanel
        cart={cart}
        busy={false}
        onClose={vi.fn()}
        onQuantity={vi.fn()}
        onCart={setCart}
        onCoupons={async () => {}}
        onSelection={async (selection) => {
          review(selection);
          const next = {
            ...cart,
            revision: cart.revision + 1,
            checkout: selection,
          };
          setCart(next);
          return next;
        }}
        onBuy={buy}
      />
    );
  }
  render(
    <LocaleProvider>
      <View />
    </LocaleProvider>,
  );
  return { review, buy, current: () => current };
}
describe("B2B checkout approval", () => {
  it("requests the reviewed revision and purchases after approval refresh without another review", async () => {
    const h = harness(),
      user = userEvent.setup();
    expect(
      screen.getByRole("button", { name: "Request purchase approval" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Review order" }));
    expect(
      screen.getByRole("button", { name: "Pending approval" }),
    ).toBeDisabled();
    api
      .mockReset()
      .mockResolvedValueOnce({ id: "approval" })
      .mockResolvedValueOnce({
        ...h.current(),
        b2b: {
          ...h.current().b2b,
          approval: { id: "approval", state: "pending" },
        },
      });
    await user.click(
      screen.getByRole("button", { name: "Request purchase approval" }),
    );
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(api.mock.calls[0]).toEqual([
      "/store-api/b2b/approval.request",
      { revision: 2 },
      "unit-context",
    ]);
    expect(api.mock.calls[1]).toEqual([
      "/store-api/checkout/cart",
      undefined,
      "unit-context",
    ]);
    api.mockResolvedValueOnce({
      ...h.current(),
      b2b: {
        ...h.current().b2b,
        approval: { id: "approval", state: "approved" },
      },
    });
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    const purchase = await screen.findByRole("button", {
      name: /Order with obligation to pay/,
    });
    await waitFor(() => expect(purchase).toBeEnabled());
    await user.click(purchase);
    expect(h.buy).toHaveBeenCalledOnce();
    expect(h.review).toHaveBeenCalledOnce();
  });
  it("requires new review when refreshed total changes despite an approved state", async () => {
    const h = harness(),
      user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Review order" }));
    api.mockReset().mockResolvedValue({
      ...h.current(),
      price: { ...h.current().price, totalPrice: 60 },
      b2b: {
        ...h.current().b2b,
        approval: { id: "approval", state: "approved" },
      },
    });
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByRole("button", { name: "Review order" });
    expect(h.buy).not.toHaveBeenCalled();
  });
  it("blocks form-submit bypasses for an exceeded budget", async () => {
    const initial = fixture();
    initial.b2b!.budgetAvailable = false;
    const h = harness(initial),
      user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Review order" }));
    fireEvent.submit(document.getElementById("checkout-details")!);
    await waitFor(() => expect(h.review).toHaveBeenCalledOnce());
    expect(h.buy).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Unit budget exceeded" }),
    ).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
