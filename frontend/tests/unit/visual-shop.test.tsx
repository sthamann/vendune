/** Shared renderer, inheritance and native form intake regressions. No model/provider mocks claim external effects. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import {
  normalizePage,
  newPage,
  newBlock,
  inheritedTheme,
  effectivePages,
  moveBlock,
} from "../../../extensions/apps/site-builder/model";
import Renderer, {
  themeStyle,
} from "../../../extensions/apps/site-builder/Renderer";
import PublishedForm from "../../../extensions/apps/site-forms/storefront/PublishedForm";
import { canOpenStudio } from "../../src/admin/shell/permissions";
import { newArea, moveCard } from "../../src/admin/workspace/workspace-model";

it("inherits nulls without copying translations and applies only the channel override", () => {
  const global = newPage("*", "ja-JP", "世界");
  global.slug = "home";
  global.theme = { accent: "#000000", spacing: 60 };
  const local = {
    ...newPage("de", "de-DE", "Welt"),
    slug: "home",
    theme: { accent: null, radius: 0 },
  };
  expect(inheritedTheme([global, local], "de")).toMatchObject({
    accent: "#000000",
    spacing: 60,
    radius: 0,
  });
  expect(effectivePages([global, local], "de")).toEqual([local]);
  expect(effectivePages([global, local], "fr")).toEqual([global]);
  expect(global.title).toEqual({ "ja-JP": "世界" });
  expect(themeStyle({ accent: "#ffff00" })).toMatchObject({
    "--site-accent-text": "#000000",
  });
});
it("uses stable element IDs, explicit empty product selection and the native add callback", async () => {
  const page = newPage("default", "de-DE", "Neue Kollektion");
  const products = newBlock("products", "de-DE", "Auswahl");
  products.productMode = "selected";
  page.content.blocks = [products];
  const add = vi.fn();
  const product = {
    id: "tee",
    name: "Shirt",
    price: 29,
    currency: "EUR",
    media: [],
  };
  const props = {
    page,
    products: [product],
    theme: {},
    language: "de-DE",
    mainLocale: "de-DE",
    request: vi.fn(),
    channel: "default",
    onAdd: add,
  };
  const view = render(<Renderer {...props} />);
  expect(screen.queryByText("Shirt")).toBeNull();
  products.products = ["tee"];
  view.rerender(<Renderer {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /Warenkorb/ }));
  expect(add).toHaveBeenCalledWith("tee");
  const second = newBlock("text", "de-DE", "Details");
  expect(moveBlock([products, second], 0, 1).map((b) => b.id)).toEqual([
    second.id,
    products.id,
  ]);
});
it("requires explicit acknowledgement, sends declared answers to the existing app contract and confirms intake", async () => {
  const request = vi.fn().mockResolvedValue({ accepted: true }),
    block = {
      id: "contact",
      fields: [
        {
          id: "email",
          kind: "email" as const,
          required: true,
          label: { "de-DE": "E-Mail" },
        },
      ],
    };
  render(
    <PublishedForm
      block={block}
      page="contact_page"
      channel="default"
      language="de-DE"
      mainLocale="de-DE"
      request={request}
    />,
  );
  expect(screen.getByRole("button")).toBeDisabled();
  await userEvent.type(screen.getByRole("textbox"), "buyer@example.test");
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(screen.getByRole("button"));
  expect(request).toHaveBeenCalledWith(
    "/store-api/apps/site_forms/actions/submit",
    {
      fields: {
        page: "contact_page",
        block: "contact",
        channel: "default",
        answers: { email: "buyer@example.test" },
        consent: true,
      },
    },
  );
  expect(await screen.findByRole("status")).toBeVisible();
});
it("workspace layouts never grant rights and keyboard moves preserve card identity", () => {
  const area = newArea("Service", "service", ["catalog.read"]);
  expect(area.cards).toEqual([]);
  expect(canOpenStudio("orders", ["orders.read"])).toBe(false);
  expect(moveCard(["orders", "customers"], 0, 1)).toEqual([
    "customers",
    "orders",
  ]);
});

it("normalizes validated optional fields from API/agent documents before rendering", () => {
  const p = newPage("default", "de-DE", "Shop");
  const incomplete = {
    ...p,
    content: { blocks: [{ id: "hero", kind: "hero" }] },
  };
  expect(normalizePage(incomplete as typeof p).content.blocks[0]).toMatchObject(
    { products: [], fields: [], image: "", rich: null, text: {} },
  );
});

it("pins only safe filters and hands them off once in memory without changing the URL", async () => {
  const { safePinnedCriteria, openPinnedView, consumePinnedView } =
    await import("../../src/shared/grid/pinned-view");
  const url = location.href;
  expect(
    safePinnedCriteria({
      query: "buyer@example.test",
      customer: "Alice",
      state: "open",
      sort: "created",
    }),
  ).toEqual({ state: "open", sort: "created" });
  openPinnedView(
    "orders",
    JSON.stringify({ query: "buyer@example.test", state: "open" }),
  );
  expect(consumePinnedView("customers")).toBeUndefined();
  expect(consumePinnedView("orders")).toEqual({ state: "open" });
  expect(consumePinnedView("orders")).toBeUndefined();
  expect(location.href).toBe(url);
  const { prepareGoalFlow, goalTemplate } =
    await import("../../src/admin/automation/goal-template");
  prepareGoalFlow("Prepare a collection");
  expect(goalTemplate("de-DE")).toMatchObject({
    active: false,
    action: "ai_proposal",
    instruction: { "de-DE": "Prepare a collection" },
  });
  expect(goalTemplate("de-DE")).toBeNull();
});
