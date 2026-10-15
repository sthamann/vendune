/** Graphical insertion and shared agent controls exercise the same native editor state. */
import {
  render as testingRender,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
} from "../../../../frontend/tests/unit/package-test-support";
import type { ReactNode } from "react";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";
const render = (ui: ReactNode) =>
  testingRender(<LocaleScope locale="en-GB">{ui}</LocaleScope>);
import BlockPalette from "../studio/BlockPalette";
import ShopDesigner from "../studio/ShopDesigner";
import DesignAgent from "../studio/DesignAgent";
import { newPage } from "../model";
import type { AppSurface } from "../../../../frontend/src/shared/apps/AppSurfaces";
const app: AppSurface = {
  app: "care",
  version: "1.1.0",
  mainLocale: "de-DE",
  surface: {
    id: "advice",
    location: "storefront.block",
    label: { "de-DE": "Pflegewissen" },
    actions: ["read"],
  },
};
it("inserts graphical built-in and app elements with stable app references", () => {
  const insert = vi.fn();
  render(<BlockPalette elements={[app]} disabled={false} onAdd={insert} />);
  const hero = screen.getByRole("button", { name: /Hero/ });
  expect(hero.querySelector("svg.designer-block-art")).not.toBeNull();
  fireEvent.click(hero);
  expect(insert.mock.calls[0][0]).toMatchObject({ kind: "hero" });
  fireEvent.click(screen.getByRole("button", { name: /Pflegewissen/ }));
  expect(insert.mock.calls[1][0]).toMatchObject({
    kind: "app",
    extension: { app: "care", surface: "advice" },
  });
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Pflege" },
  });
  expect(screen.queryByRole("button", { name: /Hero/ })).toBeNull();
});
it("disables insertion for a read-only caller", () => {
  render(<BlockPalette elements={[app]} disabled onAdd={vi.fn()} />);
  expect(screen.getByRole("button", { name: /Pflegewissen/ })).toBeDisabled();
});
const home = {
  ...newPage("default", "en-GB", "Shop"),
  revision: 3,
  slug: "home",
};
const context = {
  channels: [{ id: "default", data: { name: { "en-GB": "Main" } } }],
  mainLocale: "en-GB",
  locales: ["en-GB"],
  installed: ["site_builder", "site_forms"],
  catalogue: { elements: [] },
  elements: [app],
};
it("keeps the prompt while switching between elements and agent modes", async () => {
  const request = vi.fn(async (path: string) =>
    path.includes("/context") ? context : { elements: [home] },
  );
  render(
    <ShopDesigner
      request={request}
      workspace="one"
      rights={["channels.read", "channels.manage", "assistant.use"]}
      sandbox
      onEnvironments={() => {}}
    />,
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Agent" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "What would you like to change?" }),
    { target: { value: "Make the hero airy" } },
  );
  fireEvent.click(screen.getByRole("tab", { name: "Elements" }));
  expect(screen.getByRole("button", { name: /Pflegewissen/ })).toBeVisible();
  fireEvent.click(screen.getByRole("tab", { name: "Agent" }));
  expect(
    screen.getByRole("textbox", { name: "What would you like to change?" }),
  ).toHaveValue("Make the hero airy");
  fireEvent.click(screen.getByRole("tab", { name: "Edit" }));
  expect(
    screen.queryByRole("textbox", { name: "What would you like to change?" }),
  ).toBeNull();
});
it("saves the native baseline before exporting a coding-agent task without applying it", async () => {
  const prepare = vi.fn(async () => home),
    request = vi.fn(async () => ({
      resultTemplate: { id: home.id, revision: 3 },
    }));
  render(
    <DesignAgent
      request={request}
      page={home}
      selected=""
      disabled={false}
      onPreview={vi.fn()}
      onApplied={vi.fn()}
      onPrepare={prepare}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Codex" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "What would you like to change?" }),
    { target: { value: "Improve layout" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Prepare agent task" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/merchant/site/task",
      expect.objectContaining({ id: home.id, revision: 3, agent: "codex" }),
    ),
  );
  expect(prepare).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("heading", { name: "Task for your coding agent" }),
  ).toBeVisible();
  expect(request.mock.calls).toHaveLength(1);
});
