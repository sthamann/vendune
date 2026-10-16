/** Purchase projection labels and amounts come from immutable snapshots and native navigation remains available. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import AppConfiguredOrders from "../../src/admin/apps/AppConfiguredOrders";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { Package } from "../../src/admin/apps/app-types";
it("keeps the purchased material name and actual source currency when opening an order", async () => {
  const onOrder = vi.fn();
  const app = {
    id: "furniture",
    manifest: {
      entities: [
        { name: "materials", fields: [{ name: "name", translatable: true }] },
      ],
      configuration: {
        entity: "materials",
        inputs: {
          recordField: "material",
          fields: [{ name: "material", label: { en: "Material" } }],
        },
      },
    },
  } as unknown as Package;
  render(
    <AppConfiguredOrders
      result={{
        elements: [
          {
            orderId: "order-1",
            items: [
              {
                referencedId: "desk",
                label: "Custom desk",
                quantity: 1,
                appConfigurations: [
                  {
                    app: "furniture",
                    fields: { material: "oak" },
                    ruleFields: { name: { en: "Original oak" } },
                    feeMinor: 4800,
                    currency: "JPY",
                    appVersion: "1.0.0",
                    ruleRevision: 2,
                  },
                ],
              },
            ],
          },
        ],
      }}
      app={app}
      mainLocale="en-GB"
      onOrder={onOrder}
      busy={false}
    />,
    { wrapper: LocaleProvider },
  );
  expect(screen.getByText("Original oak")).toBeVisible();
  expect(screen.getByText(/4,800/)).toBeVisible();
  expect(screen.queryByText(/48\.00/)).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Open order" }));
  expect(onOrder).toHaveBeenCalledWith("order-1");
});
