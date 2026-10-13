/** Behavioral UI and capture regressions cover consent/scope, linked native records, errors and graph accessibility. */
import { act, render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import BehaviorAnalytics from "../../src/storefront/shell/BehaviorAnalytics";
import BehaviorView from "../../src/admin/intelligence/behavior/BehaviorView";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { Cart } from "../../src/shared/api/shop-api";
const state = vi.hoisted(() => ({
  allowed: false,
  nativeEnabled: true,
  preview: false,
  api: vi.fn(async (_path: string, _body: unknown, _token?: string) => ({
    stored: true,
  })),
}));
vi.mock("../../src/shared/legal/consent-store", () => ({
  usePurpose: () => state.allowed,
  useConsent: () => ({ behaviorAnalyticsEnabled: state.nativeEnabled }),
}));
vi.mock("../../src/storefront/shell/ChannelPreview", () => ({
  channelPreview: () => state.preview,
}));
vi.mock("../../src/shared/api/shop-api", () => ({ shopApi: state.api }));
afterEach(() => {
  cleanup();
  localStorage.clear();
  state.allowed = false;
  state.nativeEnabled = true;
  state.preview = false;
  state.api.mockClear();
});
const cart = (token: string, quantity = 0, revision = 1) =>
  ({
    id: token,
    token,
    status: "open",
    revision,
    lineItems: quantity ? [{ id: "tee", quantity }] : [],
  }) as Cart;
it("records consented route/cart/checkout signals; clears baselines across tenants and suppresses preview and revocation", () => {
  const props = {
    shop: "one",
    channel: "default",
    cart: cart("first"),
    id: "tee",
    bag: false,
    query: "",
    route: "#product/tee",
  };
  const { rerender } = render(<BehaviorAnalytics {...props} />);
  expect(state.api).not.toHaveBeenCalled();
  state.allowed = true;
  rerender(<BehaviorAnalytics {...props} />);
  expect(state.api).toHaveBeenCalledTimes(2);
  expect(state.api.mock.calls.map((c: any) => c[1].kind)).toEqual([
    "page_view",
    "product_view",
  ]);
  rerender(<BehaviorAnalytics {...props} cart={cart("first", 1, 2)} bag />);
  expect(state.api.mock.calls.map((c: any) => c[1].kind)).toEqual([
    "page_view",
    "product_view",
    "cart_add",
    "checkout_start",
  ]);
  const sent = JSON.stringify(state.api.mock.calls);
  expect(sent).not.toContain("customerId");
  expect(sent).not.toContain("searchText");
  rerender(
    <BehaviorAnalytics {...props} shop="two" cart={cart("second", 1, 2)} />,
  );
  expect(
    state.api.mock.calls.filter((c: any) => c[1].kind === "cart_add"),
  ).toHaveLength(1);
  state.allowed = false;
  state.api.mockClear();
  rerender(<BehaviorAnalytics {...props} />);
  act(() =>
    window.dispatchEvent(
      new CustomEvent("sellama:product-question", {
        detail: { productId: "tee" },
      }),
    ),
  );
  expect(state.api).not.toHaveBeenCalled();
  state.allowed = true;
  state.preview = true;
  rerender(<BehaviorAnalytics {...props} />);
  expect(state.api).not.toHaveBeenCalled();
});
it("question observations contain an ID but never question or answer text", () => {
  state.allowed = true;
  render(
    <BehaviorAnalytics
      shop="one"
      channel="default"
      cart={cart("first")}
      id="tee"
      bag={false}
      query=""
      route="#product/tee"
    />,
  );
  state.api.mockClear();
  act(() =>
    window.dispatchEvent(
      new CustomEvent("sellama:product-question", {
        detail: { productId: "tee", question: "Private medical question" },
      }),
    ),
  );
  expect(state.api.mock.calls[0][1]).toMatchObject({
    kind: "product_question",
    productId: "tee",
  });
  expect(JSON.stringify(state.api.mock.calls)).not.toContain("Private");
});
const report = {
  salesChannelId: "default",
  days: 7,
  totals: {
    contexts: 3,
    identified: 1,
    events: 10,
    ordered: 1,
    viewed: 3,
    added: 2,
    checkout: 1,
  },
  dimensions: [
    { dimension: "browser", label: "Safari", contexts: 2, events: 5 },
    { dimension: "country", label: "DE", contexts: 3, events: 10 },
  ],
  daily: [{ day: "2026-10-12", contexts: 3, events: 10 }],
  products: [
    {
      id: "tee",
      name: "Test shirt",
      category: "fashion",
      views: 3,
      adds: 2,
      questions: 1,
      contexts: 3,
    },
  ],
  graph: {
    observations: [
      {
        source: "browser:Safari",
        target: "product:tee",
        kind: "observed",
        count: 2,
      },
    ],
    semantic: [
      {
        source: "product:tee",
        target: "intent:comfort",
        kind: "SERVES",
        state: "confirmed",
      },
    ],
  },
  journeys: [
    {
      session: "a".repeat(64),
      last: "2026-10-12T12:00:00Z",
      events: 5,
      identified: false,
    },
  ],
  canInspectJourneys: true,
  geoConfigured: false,
};
it("renders localized insights, native product graph keyboard links, bounded private journey and recovery", async () => {
  localStorage.setItem("rac-locale", "de-DE");
  const onProduct = vi.fn(),
    onEntity = vi.fn();
  const request = vi.fn(async (path: string) =>
    path === "/api/automation"
      ? {
          channels: [
            { id: "default", data: { name: { "de-DE": "Hauptshop" } } },
          ],
        }
      : path.endsWith("/journey")
        ? {
            session: "a".repeat(64),
            truncated: false,
            canOpenCustomers: true,
            canOpenOrders: true,
            events: [
              {
                id: "one",
                kind: "product_view",
                productId: "tee",
                customerId: "customer",
                customerRef: "buyer@example.test",
                orderId: "order",
                orderNumber: "123",
                time: "2026-10-12T12:00:00Z",
                dimensions: {},
              },
            ],
          }
        : report,
  );
  render(
    <LocaleProvider>
      <BehaviorView
        request={request}
        onProduct={onProduct}
        onEntity={onEntity}
      />
    </LocaleProvider>,
  );
  await screen.findAllByText("Warenkorb-Kontexte");
  expect(
    screen.getByText(
      "Besucherländer benötigen einen vertrauenswürdigen Hosting-Eingang. Unbekannte Länder bleiben unbekannt.",
    ),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Test shirt" }));
  expect(onProduct).toHaveBeenCalledWith("tee");
  const node = screen.getByRole("button", { name: "Produkte: Test shirt" });
  node.focus();
  await userEvent.keyboard("{Enter}");
  expect(onProduct).toHaveBeenCalledTimes(2);
  await userEvent.click(screen.getByRole("button", { name: /Gast-Kontext/ }));
  await screen.findByRole("button", { name: "Kunde öffnen" });
  await userEvent.click(screen.getByRole("button", { name: "Kunde öffnen" }));
  expect(onEntity).toHaveBeenCalledWith("customers", "buyer@example.test");
  await userEvent.click(
    screen.getByRole("button", { name: /Bestellung öffnen/ }),
  );
  expect(onEntity).toHaveBeenCalledWith("orders", "order");
  await userEvent.click(
    screen.getByRole("button", { name: "Verlauf schließen" }),
  );
  expect(
    screen.queryByRole("button", { name: "Kunde öffnen" }),
  ).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Zeitraum"), "30");
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/knowledge/behavior", {
      days: 30,
      salesChannelId: "default",
    }),
  );
});
it("keeps anonymous aggregates available without showing journeys and offers reload on failure", async () => {
  localStorage.setItem("rac-locale", "en-GB");
  let fail = true;
  const request = vi.fn(async (path: string) => {
    if (path === "/api/automation") return { channels: [] };
    if (fail) throw new Error("Denied");
    return { ...report, journeys: [], canInspectJourneys: false };
  });
  render(
    <LocaleProvider>
      <BehaviorView request={request} onProduct={vi.fn()} />
    </LocaleProvider>,
  );
  await screen.findByRole("alert");
  fail = false;
  await userEvent.click(screen.getByText("Try again"));
  await screen.findAllByText("Cart contexts");
  expect(
    screen.queryByRole("button", { name: /Inspect journey/ }),
  ).not.toBeInTheDocument();
});
it("does not reopen a private journey after the report window changes", async () => {
  localStorage.setItem("rac-locale", "de-DE");
  let resolve!: (value: unknown) => void;
  const pending = new Promise((r) => {
    resolve = r;
  });
  const request = vi.fn(async (path: string) =>
    path.endsWith("/journey") ? pending : report,
  );
  render(
    <LocaleProvider>
      <BehaviorView request={request} onProduct={vi.fn()} />
    </LocaleProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: /Gast-Kontext/ }),
  );
  await userEvent.selectOptions(screen.getByLabelText("Zeitraum"), "30");
  await screen.findAllByText("Warenkorb-Kontexte");
  await act(async () => {
    resolve({
      session: "old",
      canOpenCustomers: true,
      canOpenOrders: true,
      events: [
        {
          id: "one",
          kind: "product_view",
          time: "2026-10-12T12:00:00Z",
          customerRef: "buyer@example.test",
        },
      ],
    });
  });
  expect(
    screen.queryByRole("button", { name: "Kunde öffnen" }),
  ).not.toBeInTheDocument();
});
it("debounces search without saving query text and cancels it on withdrawal", async () => {
  vi.useFakeTimers();
  try {
    state.allowed = true;
    const props = {
      shop: "one",
      channel: "default",
      cart: cart("one"),
      id: null,
      bag: false,
      query: "private health query",
      route: "#",
    };
    const { rerender } = render(<BehaviorAnalytics {...props} />);
    state.api.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(750);
    });
    expect(state.api).toHaveBeenCalledTimes(1);
    expect(state.api.mock.calls[0][1]).toMatchObject({ kind: "search" });
    expect(JSON.stringify(state.api.mock.calls)).not.toContain(
      "private health",
    );
    rerender(<BehaviorAnalytics {...props} query="another query" />);
    state.allowed = false;
    rerender(<BehaviorAnalytics {...props} query="another query" />);
    await act(async () => {
      vi.advanceTimersByTime(750);
    });
    expect(state.api).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

it("does not capture native behavior when channel settings disable it despite analytics consent", () => {
  state.allowed = true;
  state.nativeEnabled = false;
  render(
    <BehaviorAnalytics
      shop="one"
      channel="default"
      cart={cart("first")}
      id="tee"
      bag={false}
      query=""
      route="#product/tee"
    />,
  );
  expect(state.api).not.toHaveBeenCalled();
});
