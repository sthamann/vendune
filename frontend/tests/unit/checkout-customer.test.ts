/** Final checkout carries the current buyer identity; another tenant or merchant session cannot substitute for it. */
import { expect, it, vi } from "vitest";
import { placeCheckoutOrder } from "../../src/storefront/checkout/checkout-order";
import { cart } from "./fixtures";
it("uses the current buyer session and stops forwarding it after logout", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: "order" }),
  });
  vi.stubGlobal("fetch", fetch);
  localStorage.setItem("rac-customer:buyer-shop", "synthetic-buyer-session");
  localStorage.setItem("rac-customer:other-shop", "foreign-session");
  sessionStorage.setItem("rac-user-token", "merchant-session");
  await placeCheckoutOrder(cart, "de-DE", "buyer-shop", "b2b");
  expect(fetch.mock.calls[0][1].headers).toMatchObject({
    "x-customer-token": "synthetic-buyer-session",
    "x-tenant": "buyer-shop",
    "sw-sales-channel-id": "b2b",
  });
  localStorage.removeItem("rac-customer:buyer-shop");
  await placeCheckoutOrder(cart, "de-DE", "buyer-shop", "b2b");
  expect(fetch.mock.calls[1][1].headers).not.toHaveProperty("x-customer-token");
  localStorage.setItem("rac-customer:buyer-shop", "new-buyer-session");
  await placeCheckoutOrder(cart, "de-DE", "buyer-shop", "b2b");
  expect(fetch.mock.calls[2][1].headers["x-customer-token"]).toBe(
    "new-buyer-session",
  );
});
