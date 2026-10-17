/** Exact tender parsing and real register command recovery regression controls. */
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { inputMinor, decimalMinor } from "../../src/admin/pos/pos-model";
import { useRegister } from "../../src/admin/pos/useRegister";
import type { Channel } from "../../src/admin/channels/channel-model";
import { createStudioRequest } from "../../src/admin/shell/requests";
vi.mock("../../src/admin/pos/pos-i18n", () => ({
  usePosText: () => (key: string) => key,
}));
const channel: Channel = {
  id: "register",
  revision: 1,
  data: {
    kind: "pos",
    active: true,
    name: { "en-GB": "Register" },
    locales: ["en-GB"],
    productIds: [],
    pos: { country: "DE", columns: 4, compact: false, receiptMessage: {} },
  },
};
const cart = {
  id: "cart1",
  token: "secret-cart",
  revision: 2,
  status: "open",
  lineItems: [
    { id: "p", label: "Product", quantity: 1, price: { totalPrice: 9.99 } },
  ],
  checkout: {
    country: "DE",
    shippingMethodId: "pickup",
    paymentMethodId: "pos-cash",
  },
  price: {
    totalPrice: 9.99,
    totalMinor: "999",
    currency: "EUR",
    currencyScale: 2,
  },
};
describe("native POS", () => {
  it.each([
    ["en-GB", "Settings → Company details"],
    ["de-DE", "Einstellungen → Stammdaten"],
    ["fr-FR", "Paramètres → Informations de l’entreprise"],
    ["es-ES", "Configuración → Datos de la empresa"],
  ])(
    "explains the missing seller configuration in %s",
    async (locale, hint) => {
      localStorage.setItem("rac-locale", locale);
      const diagnostic = "Configure seller details before creating receipts";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({ errors: [{ detail: diagnostic, status: 400 }] }),
        }),
      );
      await expect(
        createStudioRequest(
          "fixture",
          "shop",
          locale,
        )("/api/merchant/orders/fixture/receipts", { kind: "invoice" }),
      ).rejects.toMatchObject({
        diagnostic,
        status: 400,
        message: expect.stringContaining(hint),
      });
    },
  );
  it("parses tender without hidden rounding for 0, 2, 3 and 6 decimal currencies", () => {
    expect(inputMinor("12", 0)).toBe(12n);
    expect(inputMinor("12.1", 0)).toBeNull();
    expect(inputMinor("12,34", 2)).toBe(1234n);
    expect(inputMinor("7.123", 3)).toBe(7123n);
    expect(inputMinor("7.1234", 3)).toBeNull();
    expect(inputMinor("0.000001", 6)).toBe(1n);
    for (const v of ["-1", "1e3", "NaN", "Infinity", "1234567890123", "1.2.3"])
      expect(inputMinor(v, 2)).toBeNull();
    expect(inputMinor("1", -1)).toBeNull();
    expect(decimalMinor("7123", 3)).toBe("7.123");
    expect(decimalMinor("1234", 0)).toBe("1234");
  });
  it("restores an open cart without silently creating an extra sale", async () => {
    sessionStorage.clear();
    sessionStorage.setItem("veyndo.pos.shop.register", cart.token);
    const request = vi.fn(async (path: string) =>
      path.endsWith("/context")
        ? { options: { payments: [] }, policy: { policyVersion: "1" } }
        : path.endsWith("/catalog")
          ? { elements: [], nextCursor: null }
          : cart,
    );
    const { result } = renderHook(() => useRegister(request, channel, "shop"));
    await waitFor(() => expect(result.current.cart?.id).toBe("cart1"));
    expect(request.mock.calls.some(([path]) => path.endsWith("/create"))).toBe(
      false,
    );
  });
  it("fences a double click and recovers the same committed order after a lost response", async () => {
    sessionStorage.clear();
    const order = {
      id: "order1",
      revision: 1,
      orderNumber: "POS-1",
      cart,
      payment: { state: "paid" },
    };
    let committed = false;
    const request = vi.fn(async (path: string) => {
      if (path.endsWith("/context"))
        return {
          options: { payments: [{ id: "pos-cash", mode: "cash" }] },
          policy: { policyVersion: "1" },
        };
      if (path.endsWith("/create"))
        return {
          cart,
          options: { payments: [] },
          policy: { policyVersion: "1" },
        };
      if (path.endsWith("/catalog")) return { elements: [], nextCursor: null };
      if (path.endsWith("/complete")) {
        committed = true;
        await new Promise((r) => setTimeout(r, 15));
        throw new Error("Lost response");
      }
      if (path.endsWith("/cart"))
        return { ...cart, order: committed ? order : undefined };
      throw new Error("Unexpected operation");
    });
    const { result } = renderHook(() => useRegister(request, channel, "shop"));
    await waitFor(() => expect(result.current.cart?.id).toBe("cart1"));
    await act(async () => {
      await Promise.all([
        result.current.complete("1000", false, false),
        result.current.complete("1000", false, false),
      ]);
    });
    expect(result.current.order?.id).toBe("order1");
    expect(
      request.mock.calls.filter(([path]) => path.endsWith("/complete")),
    ).toHaveLength(1);
  });
});
