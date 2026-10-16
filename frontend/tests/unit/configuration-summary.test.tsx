/** Accepted labels and values survive package changes and appear in real checkout and completion views. */
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ConfigurationSummary from "../../src/shared/apps/ConfigurationSummary";
import CheckoutSummary from "../../src/storefront/checkout/CheckoutSummary";
import OrderCompletion from "../../src/storefront/checkout/OrderCompletion";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { ConfigurationSnapshot } from "../../src/shared/api/configuration-types";
import type { Cart, Order } from "../../src/shared/api/shop-api";
import { cart } from "./fixtures";

const config: ConfigurationSnapshot = {
  app: "example",
  fields: { material: "record-1", width: 260, depth: 80 },
  feeMinor: 4800,
  currency: "JPY",
  appVersion: "1.0.0",
  ruleRevision: 1,
  presentation: {
    title: { "it-IT": "Scelta salvata" },
    mainLocale: "it-IT",
    fields: [
      {
        label: { "it-IT": "Materiale originale" },
        value: { "it-IT": "Rovere originale" },
      },
      { label: { "it-IT": "Misura" }, value: 260 },
      { label: { "it-IT": "Attivo" }, value: false },
    ],
  },
};

it("uses the frozen fifth-language labels, false/zero values and source currency", () => {
  render(<ConfigurationSummary configurations={[config]} language="it-IT" />, {
    wrapper: LocaleProvider,
  });
  expect(screen.getByText("Scelta salvata")).toBeVisible();
  expect(screen.getByText("Rovere originale")).toBeVisible();
  expect(screen.getByText("260")).toBeVisible();
  expect(screen.getByText("No")).toBeVisible();
  expect(screen.getByText(/4,800/)).toBeVisible();
  expect(screen.queryByText("record-1")).toBeNull();
  expect(screen.queryByText(/48\.00/)).toBeNull();
});

it("renders legacy selected values safely without fetching or inventing a currency", () => {
  const { container } = render(
    <ConfigurationSummary
      configurations={[
        {
          fields: { custom_note: '<img src=x onerror="alert(1)">', count: 0 },
          feeMinor: 2000,
        },
      ]}
      language="en-GB"
    />,
    { wrapper: LocaleProvider },
  );
  expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeVisible();
  expect(screen.getByText("0")).toBeVisible();
  expect(container.querySelector("img")).toBeNull();
  expect(screen.queryByText(/20\.00/)).toBeNull();
});

it("shows the same accepted configuration before purchase and after completion", () => {
  const snapshot: Cart = {
    ...cart,
    lineItems: [
      {
        id: "p",
        label: "Custom item",
        quantity: 1,
        minPurchase: 1,
        purchaseSteps: 1,
        price: { unitPrice: 397, totalPrice: 397 },
        appConfigurations: [config],
      },
    ],
  };
  const review = render(
    <CheckoutSummary
      cart={snapshot}
      busy={false}
      reviewed
      onCoupons={vi.fn()}
      onQuantity={vi.fn()}
      onClose={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  expect(screen.getByText("Rovere originale")).toBeVisible();
  review.unmount();
  const order: Order = {
    id: "order",
    orderNumber: "RAC-test",
    revision: 1,
    state: "open",
    cart: snapshot,
    payment: { provider: "simulated", state: "authorized" },
  };
  render(<OrderCompletion order={order} onBack={vi.fn()} />, {
    wrapper: LocaleProvider,
  });
  expect(screen.getByText("Rovere originale")).toBeVisible();
  expect(screen.getByText("260")).toBeVisible();
});
