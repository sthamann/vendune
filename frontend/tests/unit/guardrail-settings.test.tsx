/** Native currency units, bounded catalogue discovery, revisioned drafts and permission-aware connected actions. */
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuardrailSettings from "../../src/admin/intelligence/GuardrailSettings";
import {
  validPolicy,
  type Settings,
  type Policy,
} from "../../src/admin/intelligence/guardrail-model";
import type { Product } from "../../src/admin/shell/studio-types";
const studio = vi.hoisted(() => ({
  access: [
    "settings.read",
    "settings.write",
    "catalog.read",
    "assistant.use",
    "environments.read",
    "automation.read",
  ],
  environment: "private-fixture",
  intent: vi.fn(),
  selectTab: vi.fn(),
  openEntity: vi.fn(),
  onProduct: vi.fn(),
}));
vi.mock("../../src/admin/shell/StudioContext", () => ({
  useStudio: () => studio,
}));
afterEach(() => {
  cleanup();
  studio.access = [
    "settings.read",
    "settings.write",
    "catalog.read",
    "assistant.use",
    "environments.read",
    "automation.read",
  ];
  vi.clearAllMocks();
});
const product = {
  id: "yen",
  name: "Fixture",
  price: 1200,
  extra: { priceCurrency: "JPY" },
  stock: 5,
} as Product;
const data = {
  mainLocale: "de-DE",
  currencies: {
    pricingCurrency: "EUR",
    baseCurrency: "EUR",
    definitions: [
      { code: "JPY", scale: 0 },
      { code: "EUR", scale: 2 },
      { code: "KWD", scale: 3 },
    ],
  },
  aiPolicy: {
    corridors: [],
    autonomy: { enabled: false, maxChangeBps: 500, productsPerDay: 20 },
  },
} as unknown as Settings;
function transport(fail = false, extra: Product[] = []) {
  return vi.fn(async (path: string, _body?: unknown, method?: string) => {
    if (path.startsWith("/api/merchant/products?"))
      return { elements: [product, ...extra] };
    if (method === "PUT") {
      if (fail) throw new Error("Stale revision");
      return { revision: 8 };
    }
    return { data: structuredClone(data), revision: 7 };
  });
}
async function addFixture() {
  await userEvent.click(
    await screen.findByRole("button", {
      name: /Fixture.*Preisgrenzen festlegen/,
    }),
  );
}
describe("AI guardrails", () => {
  it("edits displayed yen, preserves unrelated settings/revision and retains failed edits", async () => {
    const request = transport(true);
    render(<GuardrailSettings request={request} products={[product]} />);
    await addFixture();
    expect(screen.getByLabelText("Mindestpreis · JPY")).toHaveValue(1200);
    await userEvent.click(
      screen.getByRole("button", { name: "Leitplanken speichern" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Stale revision",
    );
    expect(request).toHaveBeenCalledWith(
      "/api/merchant/commerce",
      expect.objectContaining({
        revision: 7,
        data: expect.objectContaining({
          mainLocale: "de-DE",
          aiPolicy: expect.objectContaining({
            corridors: [
              expect.objectContaining({
                currency: "JPY",
                minimumMinor: 1200,
                maximumMinor: 1200,
              }),
            ],
          }),
        }),
      }),
      "PUT",
    );
    expect(screen.getByLabelText("Mindestpreis · JPY")).toBeEnabled();
  });
  it("discovers a product outside the sampled overview and converts three-decimal prices and percentages", async () => {
    const remote = {
      ...product,
      id: "remote",
      name: "Special item",
      price: 12.345,
      extra: { priceCurrency: "KWD" },
    };
    const request = transport(false, [remote]);
    render(<GuardrailSettings request={request} products={[]} />);
    await userEvent.type(await screen.findByRole("searchbox"), "Special item");
    await userEvent.click(
      await screen.findByRole("button", {
        name: /Special item.*Preisgrenzen festlegen/,
      }),
    );
    fireEvent.change(screen.getByLabelText("Mindestpreis · KWD"), {
      target: { value: "10.125" },
    });
    fireEvent.click(screen.getByText("Marge, Rabatt und Verfügbarkeit"));
    fireEvent.change(screen.getByLabelText("Netto-Stückkosten · KWD"), {
      target: { value: "7.123" },
    });
    fireEvent.change(screen.getByLabelText("Mindestmarge · %"), {
      target: { value: "12.34" },
    });
    fireEvent.change(screen.getByLabelText("Maximaler Rabatt · %"), {
      target: { value: "20.25" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Leitplanken speichern" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/merchant/commerce",
        expect.objectContaining({
          data: expect.objectContaining({
            aiPolicy: expect.objectContaining({
              corridors: [
                expect.objectContaining({
                  productId: "remote",
                  currency: "KWD",
                  minimumMinor: 10125,
                  maximumMinor: 12345,
                  unitCostNetMinor: 7123,
                  minimumMarginBps: 1234,
                  maximumDiscountBps: 2025,
                }),
              ],
            }),
          }),
        }),
        "PUT",
      ),
    );
    expect(
      request.mock.calls.some((c) =>
        c[0].includes("limit=20&search=Special%20item"),
      ),
    ).toBe(true);
  });
  it("blocks inverted ranges and margin without cost; converts autonomy percentages without changing its cap", async () => {
    const request = transport();
    render(<GuardrailSettings request={request} products={[product]} />);
    await addFixture();
    fireEvent.change(screen.getByLabelText("Mindestpreis · JPY"), {
      target: { value: "1300" },
    });
    expect(
      screen.getByRole("button", { name: "Leitplanken speichern" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Mindestpreis · JPY"), {
      target: { value: "1100" },
    });
    fireEvent.click(screen.getByText("Marge, Rabatt und Verfügbarkeit"));
    fireEvent.change(screen.getByLabelText("Mindestmarge · %"), {
      target: { value: "20" },
    });
    expect(
      screen.getByRole("button", { name: "Leitplanken speichern" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Mindestmarge · %"), {
      target: { value: "0" },
    });
    await userEvent.click(
      screen.getByRole("radio", { name: /Begrenzte automatische Preise/ }),
    );
    expect(screen.getByLabelText(/Preisänderung pro Tag/)).toHaveValue(5);
    fireEvent.change(screen.getByLabelText(/Preisänderung pro Tag/), {
      target: { value: "2.5" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Leitplanken speichern" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/merchant/commerce",
        expect.objectContaining({
          data: expect.objectContaining({
            aiPolicy: expect.objectContaining({
              autonomy: {
                enabled: true,
                maxChangeBps: 250,
                productsPerDay: 20,
              },
            }),
          }),
        }),
        "PUT",
      ),
    );
  });
  it("hands saved product context to native product editor and shared agent; pending edits prevent silent navigation loss", async () => {
    const request = transport();
    render(<GuardrailSettings request={request} products={[product]} />);
    await addFixture();
    expect(
      screen.getByRole("button", { name: "Produkt öffnen" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Mit dem Assistenten prüfen" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Leitplanken speichern" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Produkt öffnen" }),
      ).toBeEnabled(),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Produkt öffnen" }),
    );
    expect(studio.openEntity).toHaveBeenCalledWith("productData", "yen");
    await userEvent.click(
      screen.getByRole("button", { name: "Mit dem Assistenten prüfen" }),
    );
    expect(studio.onProduct).toHaveBeenCalledWith("yen");
    expect(studio.intent).toHaveBeenCalledWith(
      expect.stringContaining("Produkt: yen"),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Sandbox-Veröffentlichung prüfen" }),
    );
    expect(studio.selectTab).toHaveBeenCalledWith("environments");
  });
  it("does not read policy without settings access or offer unrelated privileged entry points", async () => {
    studio.access = ["knowledge.read"];
    const request = transport();
    render(<GuardrailSettings request={request} products={[]} />);
    expect(screen.getByText(/Leserechte für Shop-Einstellungen/)).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });
  it("supports read-only policy without catalogue/agent rights and never loads the catalogue", async () => {
    studio.access = ["settings.read"];
    const request = transport();
    render(<GuardrailSettings request={request} products={[]} />);
    expect(await screen.findByText(/Du kannst Grenzen ansehen/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Leitplanken speichern" }),
    ).toBeDisabled();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mit dem Assistenten prüfen" }),
    ).not.toBeInTheDocument();
    expect(
      request.mock.calls.every((c) => c[0] === "/api/merchant/commerce"),
    ).toBe(true);
  });
  it("hydrates saved products beyond the overview through the native multilingual editor shape", async () => {
    const settings = structuredClone(data);
    settings.aiPolicy!.corridors = [
      {
        productId: "outside",
        currency: "JPY",
        minimumMinor: 1200,
        maximumMinor: 1500,
        minimumMarginBps: 0,
      },
    ];
    const request = vi.fn(async (path: string) =>
      path === "/api/merchant/products/outside"
        ? {
            id: "outside",
            mainLocale: "en-GB",
            availableLocales: ["en-GB", "de-DE"],
            translations: {
              en: { name: "Outside sample", description: "" },
              de: { name: "Außerhalb der Übersicht", description: "" },
            },
            commerce: { price: 1200 },
            extra: { priceCurrency: "JPY" },
          }
        : path.includes("/products?")
          ? { elements: [] }
          : { data: settings, revision: 7 },
    );
    render(<GuardrailSettings request={request} products={[]} />);
    expect(
      await screen.findByRole("heading", { name: "Außerhalb der Übersicht" }),
    ).toBeVisible();
    expect(screen.getByText(/Aktueller Basispreis:.*1.200/)).toBeVisible();
    expect(screen.getByLabelText("Mindestpreis · JPY")).toHaveValue(1200);
  });
  it("rejects missing currencies, duplicate products and invalid native percentage ranges", () => {
    const policy: Policy = {
      corridors: [
        {
          productId: "yen",
          currency: "XYZ",
          minimumMinor: 100,
          maximumMinor: 200,
          minimumMarginBps: 0,
        },
      ],
      autonomy: { enabled: false, maxChangeBps: 500, productsPerDay: 20 },
    };
    expect(validPolicy(policy, data)).toBe(false);
    policy.corridors[0].currency = "JPY";
    expect(validPolicy(policy, data)).toBe(true);
    policy.corridors.push({ ...policy.corridors[0] });
    expect(validPolicy(policy, data)).toBe(false);
  });
});
