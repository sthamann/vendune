/** Merchant intake must review real parsed drafts, retain scope and never claim a saved product or generated image early. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import CatalogIntake from "../../src/admin/catalog/CatalogIntake";
import StudioComposer from "../../src/admin/shell/StudioComposer";
import { StudioContext } from "../../src/admin/shell/StudioContext";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { readCatalogFile } from "../../src/admin/catalog/catalog-intake-model";
import { responseError } from "../../src/shared/i18n/errors-i18n";
const request = vi.fn();
vi.mock("../../src/admin/shell/requests", () => ({
  createStudioRequest:
    (...args: unknown[]) =>
    (path: string, body: unknown) =>
      request(args, path, body),
}));
const studio = (overrides = {}) =>
  ({
    token: "fixture",
    locale: "en-GB",
    workspace: "shop-a",
    workspaceName: "Synthetic merchant",
    environment: "stage-a",
    access: ["catalog.read", "catalog.write", "assistant.use"],
    environments: [{ id: "stage-a", name: "Private catalogue" }],
    liveRequest: vi.fn(),
    refreshEnvironments: vi.fn(),
    setEnvironment: vi.fn(),
    openEntity: vi.fn(),
    provider: "platform",
    model: "",
    connected: true,
    busy: false,
    t: (k: string) => k,
    composer: { current: null },
    draft: "",
    setDraft: vi.fn(),
    send: vi.fn(),
    ...overrides,
  }) as any;
function wrapper(value = studio()) {
  return ({ children }: { children: React.ReactNode }) => (
    <LocaleProvider>
      <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
    </LocaleProvider>
  );
}
const preview = {
  settingsRevision: 4,
  mainLocale: "sv-SE",
  currency: "SEK",
  demo: true,
  drafts: [
    { name: "Lässtol", description: "Synthetic", price: 1900, imageUrl: "" },
  ],
};
function mockRequests() {
  request.mockReset();
  request.mockImplementation(async (_, path, body) => {
    if (path === "/api/merchant/media/provider") return { configured: false };
    if (path === "/api/merchant/catalog/intake")
      return body
        ? preview
        : { mainLocale: "sv-SE", taxes: [{ defaultRate: 25 }] };
    if (path.endsWith("/save")) return { saved: true, revision: 1 };
    throw new Error(`Unexpected request ${path}`);
  });
}
it("described products require explicit preparation and approval and retain fifth main language/currency/sandbox", async () => {
  mockRequests();
  const user = userEvent.setup();
  render(<CatalogIntake initialMode="demo" onClose={vi.fn()} />, {
    wrapper: wrapper(),
  });
  await user.type(
    screen.getByRole("textbox", { name: "What products do you want to try?" }),
    "Reading corner",
  );
  expect(request.mock.calls.some((c) => c[2]?.mode)).toBe(false);
  await user.click(
    screen.getByRole("button", { name: "Prepare product preview" }),
  );
  await screen.findByRole("heading", { name: "Review and edit products" });
  expect(
    screen.getByRole("checkbox", { name: "Prepare AI images after creation" }),
  ).toBeDisabled();
  expect(request.mock.calls.some((c) => c[1].endsWith("/save"))).toBe(false);
  await user.clear(screen.getByRole("textbox", { name: "Product name" }));
  await user.type(
    screen.getByRole("textbox", { name: "Product name" }),
    "Reviewed chair",
  );
  await user.click(
    screen.getByRole("button", { name: /Create selected products in sandbox/ }),
  );
  await screen.findByText("Saved in sandbox");
  const save = request.mock.calls.find((c) => c[1].endsWith("/save"));
  expect(save?.[0]).toEqual(["fixture", "stage-a", "en-GB"]);
  expect(save?.[2]).toMatchObject({
    approve: true,
    mainLocale: "sv-SE",
    currency: "SEK",
    taxRate: 25,
    draft: { name: "Reviewed chair" },
  });
  expect(request.mock.calls.some((c) => c[1].includes("media/jobs"))).toBe(
    false,
  );
});
it("CSV upload reads the real file and sends its content only for review", async () => {
  mockRequests();
  const user = userEvent.setup();
  render(<CatalogIntake initialMode="csv" onClose={vi.fn()} />, {
    wrapper: wrapper(),
  });
  const content = 'name,price\n"Chair",19.9\n';
  fireEvent.change(screen.getByLabelText("Upload CSV"), {
    target: {
      files: [new File([content], "catalog.csv", { type: "text/csv" })],
    },
  });
  await screen.findByText("catalog.csv");
  await user.click(
    screen.getByRole("button", { name: "Prepare product preview" }),
  );
  await waitFor(() =>
    expect(
      request.mock.calls.find((c) => c[2]?.mode === "csv")?.[2].source,
    ).toBe(content),
  );
});
it("invalid files fail before any preparation, and CSV remains available without AI rights", async () => {
  mockRequests();
  render(<CatalogIntake initialMode="csv" onClose={vi.fn()} />, {
    wrapper: wrapper(studio({ access: ["catalog.read", "catalog.write"] })),
  });
  fireEvent.change(screen.getByLabelText("Upload CSV"), {
    target: { files: [new File(["junk"], "bad.exe")] },
  });
  await screen.findByRole("alert");
  expect(
    screen.getByRole("button", { name: "Describe sample products" }),
  ).toBeDisabled();
  expect(request.mock.calls.some((c) => c[2])).toBe(false);
  await expect(
    readCatalogFile(new File([new Uint8Array([255, 254])], "bad.csv")),
  ).rejects.toThrow("fileInvalid");
});
it("a delayed file read from a discarded source cannot enable the new source", async () => {
  mockRequests();
  const user = userEvent.setup();
  render(<CatalogIntake initialMode="csv" onClose={vi.fn()} />, {
    wrapper: wrapper(),
  });
  let finish!: (v: ArrayBuffer) => void;
  const file = new File(["csv"], "late.csv");
  Object.defineProperty(file, "arrayBuffer", {
    value: () => new Promise<ArrayBuffer>((r) => (finish = r)),
  });
  fireEvent.change(screen.getByLabelText("Upload CSV"), {
    target: { files: [file] },
  });
  await user.click(screen.getByRole("button", { name: "Product or shop URL" }));
  finish(new TextEncoder().encode("name,price\na,1").buffer);
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Product source" })).toHaveValue(
      "",
    ),
  );
  expect(
    screen.getByRole("button", { name: "Prepare product preview" }),
  ).toBeDisabled();
});
it("merchant chat shows source actions only with current catalogue write rights", () => {
  const view = render(<StudioComposer />, {
    wrapper: wrapper(studio({ access: ["catalog.read"] })),
  });
  expect(screen.queryByRole("button", { name: "Upload CSV" })).toBeNull();
  view.unmount();
  render(<StudioComposer />, { wrapper: wrapper() });
  expect(screen.getByRole("button", { name: "Upload CSV" })).toBeVisible();
});
it("CSV errors identify the actual line in German using server metadata", () => {
  localStorage.setItem("rac-locale", "de-DE");
  expect(
    responseError("CSV row has an invalid price", 400, {
      kind: "validation_error",
      pointer: "/catalogIntake/rows/3",
    }).message,
  ).toContain("CSV-Zeile 3");
});

it("opens the saved product only in the explicitly selected destination scope", async () => {
  const { renderHook, act } = await import("@testing-library/react");
  const { useEntityNavigation } =
    await import("../../src/admin/shell/useEntityNavigation");
  const { result, rerender } = renderHook(
    ({ scope }) => useEntityNavigation(scope, ["assistant", "productData"]),
    { initialProps: { scope: "live" } },
  );
  act(() =>
    result.current.openEntity("productData", "new-product", "private-stage"),
  );
  expect(result.current.entityTarget).toBeUndefined();
  rerender({ scope: "private-stage" });
  expect(result.current.entityTarget).toEqual({
    tab: "productData",
    id: "new-product",
  });
  rerender({ scope: "other-shop" });
  expect(result.current.entityTarget).toBeUndefined();
});
it("drops a cross-scope product handoff if another shop is selected instead", async () => {
  const { renderHook, act } = await import("@testing-library/react");
  const { useEntityNavigation } =
    await import("../../src/admin/shell/useEntityNavigation");
  const { result, rerender } = renderHook(
    ({ scope }) => useEntityNavigation(scope, ["assistant", "productData"]),
    { initialProps: { scope: "live" } },
  );
  act(() =>
    result.current.openEntity("productData", "private-product", "wanted-stage"),
  );
  rerender({ scope: "unrelated-shop" });
  expect(result.current.entityTarget).toBeUndefined();
  rerender({ scope: "wanted-stage" });
  expect(result.current.entityTarget).toBeUndefined();
});

it("product editor headings inherit the actual main-language name rather than describing an existing product as new", async () => {
  const { productName, newDraft } =
    await import("../../src/admin/catalog/catalog-model");
  const draft = {
    ...newDraft(),
    mainLocale: "sv-SE",
    translations: {
      sv: { name: "Lässtol", description: "" },
      de: { name: null, description: null },
    },
  };
  expect(productName(draft, "de")).toBe("Lässtol");
  expect(
    productName(
      {
        ...draft,
        mainLocale: "en-US",
        translations: {
          "en-US": { name: "Regional chair", description: "" },
          en: { name: "Other region", description: "" },
        },
      },
      "de",
    ),
  ).toBe("Regional chair");
});
