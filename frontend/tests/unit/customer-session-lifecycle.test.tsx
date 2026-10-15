/** Exercise the actual account consumer: late pagination cannot clear or contaminate a renewed customer. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useCustomerAccount } from "../../src/storefront/account/useCustomerAccount";
import {
  acceptCustomerSession,
  customerBrowserRequest,
  customerSessionHeaders,
} from "../../src/shared/api/customer-session";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { cart } from "./fixtures";
it.each([200, 401])(
  "fences delayed account-A pagination after account B has loaded (%s)",
  async (status) => {
    acceptCustomerSession("unit-shop", {
      customerToken: "browser-customer-session",
      customerBrowserSession: true,
      customerBrowserCsrf: "a".repeat(64),
    });
    let actor = "a",
      finish!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) => {
        if (path.includes("after=next"))
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        const data = path.endsWith("/profile")
          ? { id: actor, name: actor }
          : path.endsWith("/orders")
            ? { elements: [{ id: actor + "-order" }], nextCursor: "next" }
            : path.endsWith("/downloads")
              ? { elements: [] }
              : { countries: ["DE"], payments: [], shipping: [] };
        return Promise.resolve(new Response(JSON.stringify(data)));
      }),
    );
    const { result, rerender } = renderHook(
      ({ token }) => useCustomerAccount({ ...cart, token }, vi.fn()),
      { initialProps: { token: "cart-a" }, wrapper: LocaleProvider },
    );
    await waitFor(() => expect(result.current.profile?.id).toBe("a"));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.moreOrders();
    });
    expect(finish).toBeTypeOf("function");
    actor = "b";
    acceptCustomerSession("unit-shop", {
      customerToken: "browser-customer-session",
      customerBrowserSession: true,
      customerBrowserCsrf: "b".repeat(64),
    });
    rerender({ token: "cart-b" });
    await waitFor(() => expect(result.current.profile?.id).toBe("b"));
    await act(async () => {
      finish(
        new Response(
          JSON.stringify(
            status === 401
              ? { errors: [{ detail: "Customer session expired" }] }
              : { elements: [{ id: "old-private-a-order" }], nextCursor: null },
          ),
          { status },
        ),
      );
      await pending;
    });
    expect(result.current.signed).toBe(true);
    expect(result.current.profile?.id).toBe("b");
    expect(result.current.orders.map((o) => o.id)).toEqual(["b-order"]);
    expect(result.current.error).toBe("");
    const next = customerBrowserRequest("/store-api/account/orders", {
      headers: {
        "x-tenant": "unit-shop",
        ...customerSessionHeaders("unit-shop"),
      },
    });
    expect(new Headers(next.headers).get("x-veyndo-customer-csrf")).toBe(
      "b".repeat(64),
    );
  },
);
