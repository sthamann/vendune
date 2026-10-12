/** Standalone controls edit only a unique matching local form; all writes still use its validated gateway action. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import NativeAppView from "../../src/shared/apps/native/NativeAppView";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { template } from "../../src/admin/developer/app-model";
import type { Block } from "../../src/shared/apps/native/types";

function fixture(mode = "matching") {
  const m = template();
  m.entities[0].fields = [
    {
      name: "order",
      kind: "string",
      label: { en: "Order" },
      coreReference: "order",
    },
    { name: "title", kind: "string", label: { en: "Title" }, required: true },
  ];
  const entity = m.entities[0];
  if (mode === "different-model") m.entities.push({ ...entity, name: "other" });
  const contextBinding = { field: "order", key: "orderId" as const };
  const editor: Block = {
    id: "editor",
    kind: "form",
    title: { en: "Editor" },
    entity: "guides",
    readAction: "list_guides",
    writeAction: "save_guides",
    contextBinding,
  };
  const blocks: Block[] = [editor];
  if (mode === "ambiguous") blocks.push({ ...editor, id: "second_editor" });
  blocks.push(
    {
      id: "standalone",
      kind: "textbox",
      title: { en: "Standalone title" },
      entity: mode === "different-model" ? "other" : "guides",
      dataField: "title",
      readAction: ["different-record", "different-model"].includes(mode)
        ? "list_other"
        : "list_guides",
      contextBinding,
    },
    {
      id: "save",
      kind: "button",
      title: { en: "Save through form" },
      handlers: {
        click: [
          { op: "validate", target: "editor" },
          {
            op: "call",
            action: "save_guides",
            input: { kind: "record", block: "editor" },
          },
          { op: "refresh", target: "standalone" },
        ],
      },
    },
  );
  const request = vi.fn(async (path: string, body?: any) => {
    if (path.endsWith("save_guides")) return { id: body.id, revision: 8 };
    return {
      elements: [
        {
          id:
            path.endsWith("list_other") && mode === "different-record"
              ? "foreign"
              : "owned",
          revision: 7,
          order: "order-1",
          title: "Stored title",
        },
      ],
    };
  });
  render(
    <NativeAppView
      app={m.id}
      native={{ view: { ...m.views![0], blocks }, entities: m.entities }}
      request={request}
      allowedActions={["list_guides", "list_other", "save_guides"]}
      context={{ orderId: "order-1" }}
    />,
    { wrapper: LocaleProvider },
  );
  return request;
}

it("saves a standalone control edit through the uniquely matching record form and its revision", async () => {
  const request = fixture();
  await waitFor(() =>
    expect(
      screen.getAllByRole("textbox", { name: "Title" }).at(-1),
    ).toHaveValue("Stored title"),
  );
  const input = screen.getAllByRole("textbox", { name: "Title" }).at(-1)!;
  await userEvent.clear(input);
  await userEvent.type(input, "Changed in standalone control");
  expect(screen.getAllByRole("textbox", { name: "Title" })[0]).toHaveValue(
    "Changed in standalone control",
  );
  expect(
    request.mock.calls.some(([path]) => path.endsWith("save_guides")),
  ).toBe(false);
  await userEvent.click(
    screen.getByRole("button", { name: "Save through form" }),
  );
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("save_guides"),
      {
        id: "owned",
        revision: 7,
        fields: { order: "order-1", title: "Changed in standalone control" },
      },
    ),
  );
});

it.each(["ambiguous", "different-record", "different-model"])(
  "does not guess a form binding for %s",
  async (mode) => {
    const request = fixture(mode);
    await waitFor(() =>
      expect(
        screen.getAllByRole("textbox", { name: "Title" }).at(-1),
      ).toHaveValue("Stored title"),
    );
    const input = screen.getAllByRole("textbox", { name: "Title" }).at(-1)!;
    await userEvent.clear(input);
    await userEvent.type(input, "Unrelated local value");
    expect(screen.getAllByRole("textbox", { name: "Title" })[0]).toHaveValue(
      "Stored title",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Save through form" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.stringContaining("save_guides"),
        {
          id: "owned",
          revision: 7,
          fields: { order: "order-1", title: "Stored title" },
        },
      ),
    );
  },
);
