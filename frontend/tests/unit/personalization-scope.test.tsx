/** Real personalization hook cancels stale responses and prevents cross-shop/cart preference reuse. */
import { renderHook, act, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { usePersonalization } from "../../src/storefront/shell/usePersonalization";
import type { Cart, Product } from "../../src/shared/api/shop-api";
const state = vi.hoisted(() => ({
  consent: true,
  requests: [] as ((v: any) => void)[],
}));
vi.mock("../../src/shared/legal/consent-store", () => ({
  usePurpose: () => state.consent,
}));
vi.mock("../../src/storefront/shell/ChannelPreview", () => ({
  channelPreview: () => false,
}));
vi.mock("../../src/shared/api/shop-api", () => ({
  shopApi: () => new Promise((resolve) => state.requests.push(resolve)),
}));
it("clears shop and cart changes, ignores late replies, and revokes ordering with consent", async () => {
  state.consent = true;
  state.requests = [];
  const products = [
    { id: "a", category: "A" },
    { id: "b", category: "B" },
  ] as Product[];
  const cart = (id: string) => ({ id, token: id }) as Cart;
  const { result, rerender } = renderHook(
    ({ tenant, id }) => usePersonalization(products, cart(id), "a", tenant),
    { initialProps: { tenant: "one", id: "first" } },
  );
  await act(async () =>
    state.requests[0]({ rankedProductIds: ["b", "a"], adapted: true }),
  );
  expect(result.current.list[0].id).toBe("b");
  rerender({ tenant: "two", id: "second" });
  expect(result.current.personalized).toBe(false);
  expect(result.current.list[0].id).toBe("a");
  const late = state.requests[1];
  rerender({ tenant: "two", id: "third" });
  await act(async () => late({ rankedProductIds: ["b", "a"], adapted: true }));
  expect(result.current.ranked).toEqual([]);
  await act(async () =>
    state.requests[2]({ rankedProductIds: ["b", "a"], adapted: true }),
  );
  expect(result.current.adapted).toBe(true);
  state.consent = false;
  rerender({ tenant: "two", id: "third" });
  await waitFor(() => expect(result.current.list[0].id).toBe("a"));
  expect(result.current.ranked).toEqual([]);
  expect(result.current.adapted).toBe(false);
});
