/** Structured configurations use declared fields, current cart CAS and the native API; library failures stay visible. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import ConfigurationForm from "../../src/shared/apps/ConfigurationForm";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { Slot } from "../../src/shared/apps/AppSlot";
vi.mock("../../src/shared/api/shop-api", async (original) => ({
  ...(await original<object>()),
  shopApi: (...args: unknown[]) => api(...args),
}));
const api = vi.fn();
const slot: Slot = {
  app: "furniture",
  version: "1.0.0",
  slot: { component: "product-configuration" },
  entities: [
    {
      name: "materials",
      action: "materials",
      label: { de: "Material" },
      fields: [{ name: "name", translatable: true }],
    },
  ],
  configuration: {
    inputField: "width",
    entity: "materials",
    label: { de: "Möbel gestalten" },
    hint: { de: "Maße prüfen" },
    inputs: {
      recordField: "material",
      arguments: ["width", "depth"],
      fields: [
        {
          name: "material",
          label: { de: "Material" },
          kind: "string",
          required: true,
          references: "materials",
        },
        {
          name: "width",
          label: { de: "Breite" },
          kind: "integer",
          required: true,
          validation: { minimum: 80, maximum: 400 },
        },
        {
          name: "depth",
          label: { de: "Tiefe" },
          kind: "integer",
          required: true,
          validation: { minimum: 40, maximum: 200 },
        },
      ],
    },
  },
};
beforeEach(() => {
  api.mockReset();
});
it("loads localized choices and sends typed dimensions through current cart revision", async () => {
  const user = userEvent.setup(),
    onCart = vi.fn();
  api.mockImplementation(async (path: string) =>
    path.endsWith("/materials")
      ? { elements: [{ id: "oak", name: { de: "Eiche", en: "Oak" } }] }
      : { revision: 8 },
  );
  render(
    <ConfigurationForm
      slot={slot}
      productId="desk"
      cart={{ token: "fixture", revision: 7 } as any}
      onCart={onCart}
      language="de-DE"
      mainLocale="de-DE"
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("option", { name: "Eiche" });
  await user.selectOptions(screen.getByLabelText("Material"), "oak");
  await user.type(screen.getByLabelText("Breite"), "260");
  await user.type(screen.getByLabelText("Tiefe"), "80");
  expect(screen.getByLabelText("Breite")).toHaveAttribute("max", "400");
  await user.click(screen.getByRole("button", { name: "Review & save" }));
  await waitFor(() => expect(onCart).toHaveBeenCalledWith({ revision: 8 }));
  expect(api).toHaveBeenCalledWith(
    "/store-api/apps/furniture/configure",
    {
      productId: "desk",
      revision: 7,
      fields: { material: "oak", width: 260, depth: 80 },
    },
    "fixture",
  );
});
it("shows library failures instead of silently presenting an empty choice", async () => {
  api.mockRejectedValue(new Error("Material library unavailable"));
  render(
    <ConfigurationForm
      slot={slot}
      productId="desk"
      onCart={() => {}}
      language="de-DE"
      mainLocale="de-DE"
    />,
    { wrapper: LocaleProvider },
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Material library unavailable",
  );
  expect(screen.getByRole("button", { name: "Review & save" })).toBeDisabled();
});
it("pages the material library without losing the chosen record", async () => {
  const user = userEvent.setup();
  api.mockImplementation(async (_path: string, input: { after?: string }) =>
    input?.after
      ? {
          elements: [{ id: "walnut", name: { de: "Walnuss" } }],
          hasMore: false,
        }
      : {
          elements: [{ id: "oak", name: { de: "Eiche" } }],
          hasMore: true,
          nextCursor: "oak",
        },
  );
  render(
    <ConfigurationForm
      slot={slot}
      productId="desk"
      onCart={() => {}}
      language="de-DE"
      mainLocale="de-DE"
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("option", { name: "Eiche" });
  await user.selectOptions(screen.getByLabelText("Material"), "oak");
  await user.click(screen.getByRole("button", { name: "More materials" }));
  await screen.findByRole("option", { name: "Walnuss" });
  expect(screen.getByLabelText("Material")).toHaveValue("oak");
  expect(api).toHaveBeenCalledWith(
    "/store-api/apps/furniture/actions/materials",
    { limit: 100, after: "oak" },
  );
});
