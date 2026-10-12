/** Marketplace controls prove native jobs, explicit review, inherited content and read-only admission. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import MarketplacePanel from "../../../extensions/apps/marketplaces/studio/MarketplacePanel";
import OfferEditor from "../../../extensions/apps/marketplaces/studio/OfferEditor";
import {
  freshOffer,
  fields,
} from "../../../extensions/apps/marketplaces/studio/marketplace-model";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import AppsManager from "../../src/admin/apps/AppsManager";
import manifest from "../../../extensions/apps/marketplaces/manifest.json";
const connection = {
  id: "amazon",
  revision: 1,
  name: { de: "Marktplatz" },
  channel_id: "amazon",
  provider: "amazon",
  currency: "JPY",
  locale: "ja-JP",
  active: true,
  policy: { productType: "HOME" },
};
beforeEach(() => localStorage.setItem("rac-locale", "en-GB"));
function requests() {
  return vi.fn(
    async (
      path: string,
      _body?: any,
      _method?: string,
      _options?: { idempotencyKey?: string },
    ) => {
      if (path.endsWith("list_connections")) return { elements: [connection] };
      if (path.endsWith("list_listings")) return { elements: [] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      if (path.endsWith("/sync")) return { jobId: "job" };
      if (path.endsWith("list_inbox")) throw Error("PII permission denied");
      if (path.endsWith("/currencies"))
        return { catalogue: [{ code: "JPY", scale: 0 }] };
      if (path.startsWith("/api/merchant/products"))
        return {
          elements: [{ id: "p", name: "Product", productNumber: "SKU" }],
        };
      throw Error("Unexpected marketplace request " + path);
    },
  );
}
it("retrieves through the native job action with an idempotency key and no browser secrets", async () => {
  const request = requests();
  render(
    <LocaleProvider>
      <MarketplacePanel request={request} manage mainLocale="de-DE" />
    </LocaleProvider>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Retrieve orders" }),
  );
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/apps/marketplaces/actions/sync",
      { connectionId: "amazon", kind: "orders" },
      "POST",
      { idempotencyKey: expect.any(String) },
    ),
  );
  expect(
    screen.getByRole("heading", { name: "Marktplatz" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Order inbox" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "PII permission denied",
  );
});
it("does not allow a reader to create connections or synchronize", async () => {
  render(
    <LocaleProvider>
      <MarketplacePanel
        request={requests()}
        manage={false}
        mainLocale="de-DE"
      />
    </LocaleProvider>,
  );
  expect(
    await screen.findByRole("button", { name: "Retrieve orders" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Connect marketplace" }),
  ).toBeDisabled();
});
it("uses channel currency scale zero and enables the non-English main and fifth content language", async () => {
  const save = vi.fn();
  render(
    <LocaleProvider>
      <OfferEditor
        initial={freshOffer(connection)}
        connections={[connection]}
        mainLocale="it-IT"
        request={requests()}
        busy={false}
        save={save}
        cancel={() => {}}
      />
    </LocaleProvider>,
  );
  const price = await screen.findByLabelText("Price override · minor units");
  await waitFor(() => expect(price).not.toBeDisabled());
  fireEvent.change(price, { target: { value: "1200" } });
  const product = await screen.findByRole("option", { name: "Product" });
  fireEvent.change(product.parentElement!, { target: { value: "p" } });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save" }).closest("form")!,
  );
  expect(save.mock.calls[0][0].price).toEqual({
    minor: 1200,
    currency: { code: "JPY", scale: 0 },
  });
  expect(screen.getByRole("option", { name: /Italian/ })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /Japanese/ })).toBeInTheDocument();
  expect(fields(freshOffer(connection)).description).toBeNull();
});

it("opens the installed marketplace app with all callback permission labels", async () => {
  const base = requests();
  const request = vi.fn(async (path: string, ...args: any[]) => {
    if (path === "/api/apps")
      return {
        mainLocale: "de-DE",
        packages: [
          {
            id: "marketplaces",
            version: manifest.version,
            revision: 1,
            active: true,
            manifest,
          },
        ],
      };
    if (path.endsWith("/credentials"))
      return {
        canManage: true,
        digest: "fixture",
        permissions: manifest.permissions.filter((p) =>
          [
            "data.read",
            "data.write",
            "products.read",
            "channels.read",
            "orders.read",
            "orders.import",
            "payments.record",
            "customers.pii",
            "jobs.write",
          ].includes(p),
        ),
        keys: [],
      };
    if (path.endsWith("/activity"))
      return {
        calls: [],
        deliveries: [],
        storage: { rows: 0, bytes: 0, rowLimit: 100000, byteLimit: 67108864 },
        limits: {},
      };
    if (path.endsWith("/secrets"))
      return {
        canManage: false,
        revision: 0,
        configured: false,
        kinds: [],
        secrets: [],
      };
    return base(path, args[0], args[1], args[2]);
  });
  render(
    <LocaleProvider>
      <AppsManager request={request} role="owner" token="fixture" />
    </LocaleProvider>,
  );
  fireEvent.click(
    await screen.findByRole("button", {
      name: /Marketplace Studio.*Manage app/,
    }),
  );
  expect(
    await screen.findByRole("heading", {
      name: "One catalog. More places to sell.",
    }),
  ).toBeVisible();
  expect(
    await screen.findByLabelText("Import reviewed marketplace orders"),
  ).toBeVisible();
  expect(
    screen.getByLabelText("Process this app’s background jobs"),
  ).toBeVisible();
});

it("renders background progress in interface language rather than product editing language", async () => {
  localStorage.setItem("rac-locale", "de-DE");
  const request = vi.fn(async () => ({
    jobs: [
      {
        id: "j",
        action: "sync",
        status: "succeeded",
        progress: 100,
        message: { en: "Completed", de: "Abgleich abgeschlossen" },
        revision: 1,
        result: null,
      },
    ],
  }));
  const { default: AppJobs } = await import("../../src/admin/apps/AppJobs");
  render(
    <LocaleProvider>
      <AppJobs app="marketplaces" request={request} />
    </LocaleProvider>,
  );
  expect(await screen.findByText("Abgleich abgeschlossen")).toBeVisible();
  expect(screen.queryByText("Completed")).not.toBeInTheDocument();
});
