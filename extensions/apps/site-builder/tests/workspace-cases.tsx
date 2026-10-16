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

it("moves and deletes blocks on the actual canvas with native undo and without saving", async () => {
  const page = {
    ...home,
    content: {
      blocks: [
        home.content.blocks[0],
        {
          ...home.content.blocks[0],
          id: "second",
          text: { "en-GB": "Second section" },
        },
      ],
    },
  };
  const request = vi.fn(async (path: string) =>
    path.includes("/context") ? context : { elements: [page] },
  );
  render(
    <ShopDesigner
      request={request}
      workspace="canvas-tools"
      rights={["channels.manage"]}
      sandbox
      onEnvironments={() => {}}
    />,
  );
  const first = (
    await screen.findAllByRole("group", { name: "Element controls: Hero" })
  )[0];
  fireEvent.click(first.querySelector('[aria-label="Move down"]')!);
  expect(
    [...document.querySelectorAll("[data-block-id]")].map((e) =>
      e.getAttribute("data-block-id"),
    ),
  ).toEqual(["second", home.content.blocks[0].id]);
  fireEvent.click(first.querySelector('[aria-label="Remove element"]')!);
  expect(document.querySelectorAll("[data-block-id]")).toHaveLength(1);
  fireEvent.click(
    document.querySelector('.designer-preview-bar [aria-label="Undo"]')!,
  );
  expect(document.querySelectorAll("[data-block-id]")).toHaveLength(2);
  expect(
    request.mock.calls.every(([path]) => !path.includes("save_page")),
  ).toBe(true);
});

it("submits visible URL references through the existing native planner and preserves copy by default", async () => {
  const request = vi.fn(async () => ({
    interpretation: "Source analysis",
    sources: [{ url: "https://reference.example/shop", status: "partial" }],
    variants: [{ taskId: "review-1", fields: home, summary: "Airy" }],
  }));
  render(
    <DesignAgent
      request={request}
      page={home}
      selected=""
      disabled={false}
      onPreview={vi.fn()}
      onApplied={vi.fn()}
      onPrepare={async () => home}
    />,
  );
  expect(
    screen.getByRole("region", { name: "Start with a design you like" }),
  ).toBeVisible();
  fireEvent.change(
    screen.getByRole("textbox", { name: "Reference URLs (one per line)" }),
    { target: { value: "https://reference.example/shop" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Use this design brief" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Prepare a proposal" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/merchant/site/plan",
      expect.objectContaining({
        id: home.id,
        revision: 3,
        urls: ["https://reference.example/shop"],
        style: true,
        structure: true,
        content: false,
      }),
    ),
  );
  expect(await screen.findByText("Source analysis")).toBeVisible();
  expect(request).toHaveBeenCalledOnce();
});

it("rejects invalid reference URLs before saving or sending a model request", async () => {
  const request = vi.fn(),
    prepare = vi.fn(async () => home);
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
  fireEvent.change(
    screen.getByRole("textbox", { name: "Reference URLs (one per line)" }),
    { target: { value: "https://secret:password@example.test" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Use this design brief" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Prepare a proposal" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "HTTPS URLs without credentials",
  );
  expect(request).not.toHaveBeenCalled();
  expect(prepare).not.toHaveBeenCalled();
});

it("discards a late AI proposal after a manual edit, without replacing the newer draft", async () => {
  let finish!: (value: unknown) => void;
  const request = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
    preview = vi.fn();
  const props = {
    request,
    page: home,
    selected: "",
    disabled: false,
    onPreview: preview,
    onApplied: vi.fn(),
    onPrepare: async () => home,
  };
  const view = render(<DesignAgent {...props} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Use this design brief" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Prepare a proposal" }));
  await waitFor(() => expect(request).toHaveBeenCalled());
  view.rerender(
    <LocaleScope locale="en-GB">
      <DesignAgent {...props} page={{ ...home, theme: { spacing: 80 } }} />
    </LocaleScope>,
  );
  finish({ interpretation: "Old proposal", sources: [], variants: [] });
  await waitFor(() => expect(screen.queryByText("Old proposal")).toBeNull());
  expect(preview.mock.calls.every(([page]) => page === null)).toBe(true);
});
