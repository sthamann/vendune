/** User-facing multi-placement, drag/drop, model-backed fields, settings and bounded shared flow visuals. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import { compile, template } from "../../src/admin/developer/app-model";
import AppAssistant from "../../src/admin/developer/AppAssistant";
import AppAgentDrawer from "../../src/admin/developer/AppAgentDrawer";
import AppCanvas from "../../src/admin/developer/AppCanvas";
import AppFormFields from "../../src/admin/developer/AppFormFields";
import {
  AppPanelHandle,
  useAppPanelSizing,
} from "../../src/admin/developer/AppPanelSizing";
import { logicTopology } from "../../src/admin/developer/AppLogicTopology";
import AppSettings from "../../src/admin/apps/AppSettings";
import AppSettingsEditor from "../../src/admin/developer/AppSettingsEditor";
import IntegrationKeys from "../../src/admin/developer/api/IntegrationKeys";
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocaleProvider>
    <ContentLanguage locales={["en-GB", "sv-SE"]} mainLocale="en-GB">
      {children}
    </ContentLanguage>
  </LocaleProvider>
);
it("creates product, global banner and checkout views in one editable package without sharing incompatible product context", async () => {
  const create = vi.fn(),
    user = userEvent.setup();
  render(<AppAssistant onCreate={create} onClose={() => {}} />, { wrapper });
  await user.click(
    screen.getByRole("button", { name: /Connected experience/ }),
  );
  await user.click(screen.getByLabelText("Global header banner"));
  await user.click(screen.getByLabelText("Checkout · summary"));
  await user.click(
    screen.getByRole("button", { name: "Create editable draft" }),
  );
  const m = create.mock.calls[0][0];
  expect(m.surfaces.map((s: any) => s.location)).toEqual(
    expect.arrayContaining([
      "product.detail",
      "storefront.header",
      "checkout.summary",
    ]),
  );
  expect(compile(m)).toEqual(m);
  expect(new Set(m.views.map((v: any) => v.id)).size).toBe(m.views.length);
  const global = m.surfaces.find(
    (s: any) => s.location === "storefront.header",
  );
  const view = m.views.find((v: any) => global.uiPath === `native/${v.id}`);
  expect(view.blocks.every((b: any) => !b.contextBinding)).toBe(true);
  expect(
    m.actions
      .filter((a: any) => a.public)
      .every((a: any) => a.readOnly && a.handler === "list"),
  ).toBe(true);
});
it("drops and reorders blocks in the normal stack canvas, rejecting foreign drag payloads", () => {
  const m = template(),
    change = vi.fn(),
    select = vi.fn();
  const { container } = render(
    <AppCanvas
      manifest={m}
      view={m.views![0]}
      selected=""
      onSelect={select}
      onChange={change}
      mainLocale="en-GB"
      preview={false}
      previewRequest={vi.fn()}
    />,
    { wrapper },
  );
  const canvas = container.querySelector(".app-canvas")!;
  const transfer = (kind: string, id = "") => ({
    getData: (type: string) =>
      type === "application/vnd.veyndo.kind"
        ? kind
        : type === "application/vnd.veyndo.block"
          ? id
          : "",
  });
  fireEvent.drop(canvas, { dataTransfer: transfer("button") });
  expect(change.mock.calls[0][0].views[0].blocks.at(-1).kind).toBe("button");
  const before = change.mock.calls.length;
  fireEvent.drop(canvas, { dataTransfer: transfer("script") });
  expect(change).toHaveBeenCalledTimes(before);
  fireEvent.drop(container.querySelectorAll("article")[0], {
    dataTransfer: transfer("", m.views![0].blocks[1].id),
  });
  expect(change.mock.calls.at(-1)![0].views[0].blocks[0].id).toBe(
    m.views![0].blocks[1].id,
  );
});
it("edits the actual form field caption rather than pretending sample data is live", async () => {
  const m = template(),
    change = vi.fn(),
    user = userEvent.setup();
  const block = m.views![0].blocks.find((b) => b.kind === "form")!;
  render(<AppFormFields manifest={m} block={block} onChange={change} />, {
    wrapper,
  });
  const field = screen.getByLabelText(/Field label · title/);
  await user.type(field, "!");
  expect(
    change.mock.calls
      .at(-1)![0]
      .entities[0].fields.find((f: any) => f.name === "title").label.en,
  ).toContain("!");
});
it("resizes panels by keyboard and stores only bounded presentation widths", () => {
  function Panel() {
    const p = useAppPanelSizing();
    return (
      <AppPanelHandle
        side="palette"
        value={p.widths.palette}
        onChange={(n) => p.resize("palette", n)}
      />
    );
  }
  render(<Panel />, { wrapper });
  const handle = screen.getByRole("separator");
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  expect(handle).toHaveAttribute("aria-valuenow", "196");
  expect(JSON.parse(localStorage.getItem("veyndo:app-panel-widths")!)).toEqual({
    palette: 196,
    inspector: 340,
  });
});
it("shows both branches and the continuation with the existing Flow Builder topology", () => {
  const graph = logicTopology(
    [
      {
        op: "if",
        left: { kind: "literal", value: 1 },
        compare: "eq",
        right: { kind: "literal", value: 1 },
        then: [{ op: "refresh", target: "grid" }],
        otherwise: [{ op: "msgBox", text: { en: "No" } }],
      },
      { op: "navigate", view: "done" },
    ],
    (s) => s.op,
  );
  expect(graph.value.nodes.find((n) => n.id === "ui-0")).toMatchObject({
    kind: "condition",
    on_true: "ui-0-yes-0",
    on_false: "ui-0-no-0",
  });
  expect(graph.value.nodes.filter((n) => n.id.includes("ui-0-"))).toHaveLength(
    2,
  );
  expect(graph.value.nodes.find((n) => n.id === "ui-0-yes-0")).toMatchObject({
    next: "ui-1",
  });
});
it("declares configuration fields without capturing any credential values in the Manifest", async () => {
  const m = template(),
    change = vi.fn(),
    user = userEvent.setup();
  render(<AppSettingsEditor manifest={m} onChange={change} />, { wrapper });
  await user.click(screen.getByRole("button", { name: "Add setting" }));
  expect(change.mock.calls[0][0].settings[0]).toMatchObject({
    kind: "string",
    required: false,
  });
  expect(change.mock.calls[0][0].settings[0]).not.toHaveProperty("value");
});
it("saves declared settings with explicit revision/digest approval and clears secret plaintext", async () => {
  const user = userEvent.setup(),
    fields = [
      {
        key: "token",
        kind: "secret",
        required: true,
        label: { en: "Provider token" },
      },
    ];
  let saved = false;
  const request = vi.fn(async (_path: string, _body?: any, method?: string) => {
    if (method === "PUT") {
      saved = true;
      return { saved: true };
    }
    return {
      fields,
      values: {},
      configured: saved ? ["token"] : [],
      revision: saved ? 1 : 0,
      digest: "digest",
      current: true,
      canManage: true,
      encryptionReady: true,
    };
  });
  render(<AppSettings app="sample" request={request} mainLocale="en-GB" />, {
    wrapper,
  });
  const input = await screen.findByLabelText("Provider token");
  await user.type(input, "synthetic-only-credential");
  await user.click(
    screen.getByLabelText("Use these values with this installed app version"),
  );
  await user.click(screen.getByRole("button", { name: "Save app settings" }));
  await screen.findByText("Settings saved");
  expect(input).toHaveValue("");
  expect(request).toHaveBeenCalledWith(
    "/api/apps/sample/settings",
    {
      revision: 0,
      digest: "digest",
      approve: true,
      values: { token: "synthetic-only-credential" },
    },
    "PUT",
  );
});
it("offers non-expiring integration keys with explicit scopes and searchable permissions", async () => {
  const user = userEvent.setup(),
    request = vi.fn(async (path: string, _body?: any, method?: string) =>
      path === "/api/auth/access"
        ? {
            permissions: ["team.manage", "catalog.read"],
            personalSession: true,
          }
        : method === "POST"
          ? { key: "synthetic-key" }
          : { elements: [] },
    );
  render(<IntegrationKeys request={request} />, { wrapper });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Create key" }).closest("fieldset"),
    ).not.toBeDisabled(),
  );
  await user.type(screen.getByLabelText("Key name"), "Test integration");
  await user.selectOptions(screen.getByLabelText("Key lifetime"), "permanent");
  await user.click(screen.getByText(/\(catalog.read\)/));
  await user.click(screen.getByRole("button", { name: "Create key" }));
  expect(request).toHaveBeenCalledWith(
    "/api/workspace/integrations",
    {
      name: "Test integration",
      expiresInDays: 30,
      nonExpiring: true,
      permissions: ["catalog.read"],
    },
    "POST",
  );
});

it("keeps the agent in a separate dialog and preserves an unfinished prompt when it is closed", async () => {
  const user = userEvent.setup(),
    close = vi.fn();
  const show = vi
    .spyOn(HTMLDialogElement.prototype, "showModal")
    .mockImplementation(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
  const hide = vi
    .spyOn(HTMLDialogElement.prototype, "close")
    .mockImplementation(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
  const studio = {
    manifest: template(),
    mainLocale: "en-GB",
    providers: [],
    busy: false,
    env: "stage",
    proposal: null,
  } as any;
  const props = { onClose: close, studio, request: vi.fn() };
  const { rerender } = render(<AppAgentDrawer {...props} open={false} />, {
    wrapper,
  });
  expect(screen.queryByRole("dialog")).toBeNull();
  rerender(<AppAgentDrawer {...props} open />);
  expect(show).toHaveBeenCalledOnce();
  expect(screen.getByRole("dialog", { name: "AI assistant" })).toBeVisible();
  const prompt = screen.getByRole("textbox", {
    name: "What would you like to change?",
  });
  await user.type(prompt, "Add a welcome banner");
  await user.click(screen.getByRole("button", { name: "Close assistant" }));
  expect(close).toHaveBeenCalled();
  rerender(<AppAgentDrawer {...props} open={false} />);
  expect(hide).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
  rerender(<AppAgentDrawer {...props} open />);
  expect(
    screen.getByRole("textbox", { name: "What would you like to change?" }),
  ).toHaveValue("Add a welcome banner");
  fireEvent(screen.getByRole("dialog"), new Event("cancel"));
  expect(close).toHaveBeenCalledTimes(2);
  show.mockRestore();
  hide.mockRestore();
});
