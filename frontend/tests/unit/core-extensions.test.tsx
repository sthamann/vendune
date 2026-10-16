/** A native object's app fields retain anchors, current revisions and read-only admission across real form edits. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import CoreExtensions, {
  type CoreExtension,
} from "../../src/shared/apps/CoreExtensions";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../src/shared/i18n/ContentLanguagePicker";
import { normalizeLayout } from "../../src/shared/grid/preferences";
import { extensionColumns } from "../../src/shared/grid/extension-columns";
import ExtensionFilter from "../../src/shared/grid/ExtensionFilter";
import { bindExtension } from "../../src/admin/developer/core-extension-model";
import { compile, template } from "../../src/admin/developer/app-model";
const extension: CoreExtension = {
  app: "context",
  version: "1.0.0",
  entity: "details",
  label: { "en-GB": "Extra details" },
  model: {
    name: "details",
    label: { "en-GB": "Extra details" },
    publicRead: false,
    extends: { version: 1, object: "product", field: "native_id" },
    fields: [
      {
        name: "native_id",
        label: {},
        kind: "string",
        required: true,
        indexed: true,
        unique: true,
        coreReference: "product",
      },
      {
        name: "segment",
        label: { "en-GB": "Segment" },
        kind: "string",
        indexed: true,
      },
      {
        name: "count",
        label: { "en-GB": "Count" },
        kind: "integer",
        indexed: true,
      },
    ],
  },
  readAction: "read",
  writeAction: "write",
  record: {
    id: "saved",
    revision: 3,
    native_id: "mug",
    segment: "Wholesale",
    count: 2,
  },
  language: {
    mainLocale: "en-GB",
    locales: ["en-GB", "de-DE", "fr-FR", "es-ES", "it-IT"],
  },
  native: {},
};
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("rac-locale", "en-GB");
});
it("edits the existing bound record without an ID chooser, preserves CAS and keeps the accepted values", async () => {
  const request = vi.fn(async (_path: string, _body?: unknown) => ({
    id: "saved",
    revision: 4,
  }));
  render(
    <CoreExtensions
      objectId="mug"
      extensions={[extension]}
      request={request}
    />,
    { wrapper: LocaleProvider },
  );
  const field = screen.getByRole("textbox", { name: "Segment" });
  expect(field).toHaveValue("Wholesale");
  expect(screen.queryByRole("combobox", { name: "Record" })).toBeNull();
  await userEvent.clear(field);
  await userEvent.type(field, "Retail");
  await userEvent.click(screen.getByRole("button", { name: "Save record" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/apps/context/actions/write", {
      id: "saved",
      revision: 3,
      fields: { native_id: "mug", segment: "Retail", count: 2 },
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Segment" })).toHaveValue(
      "Retail",
    ),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("Record saved");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Segment" }),
    " again",
  );
  expect(screen.queryByRole("status")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(request.mock.calls[1][1]).toMatchObject({ revision: 4 });
});
it("read-only metadata disables native field editing and never offers a save", () => {
  const request = vi.fn();
  render(
    <CoreExtensions
      objectId="mug"
      extensions={[{ ...extension, writeAction: null }]}
      request={request}
    />,
    { wrapper: LocaleProvider },
  );
  expect(screen.getByRole("textbox", { name: "Segment" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Save record" })).toBeNull();
  expect(request).not.toHaveBeenCalled();
});
it("compiles all four native bindings and keeps stronger custom permissions", () => {
  for (const object of ["product", "customer", "order", "company"] as const) {
    const m = template();
    m.entities[0] = bindExtension(m.entities[0], object);
    const compiled = compile(m);
    const save = compiled.actions!.find((a) => a.handler === "save")!;
    expect(save.requiredPermissions).toContain(
      {
        product: "catalog.write",
        customer: "customers.write",
        order: "orders.write",
        company: "b2b.manage",
      }[object],
    );
    expect(
      compiled.entities[0].fields.find((f) => f.name === "native_id"),
    ).toMatchObject({
      indexed: true,
      unique: true,
      required: true,
      label: m.entities[0].label,
    });
    expect(compiled.entities[0].publicRead).toBe(false);
  }
});
it("discovers namespaced optional grid columns and submits an exact typed server filter", async () => {
  const rows = [{ id: "mug", extensions: [extension] }];
  const columns = extensionColumns(rows, "en-GB");
  expect(columns.map((c) => c.id)).toEqual([
    "app:context:details:segment",
    "app:context:details:count",
  ]);
  expect(columns[0].render(rows[0])).toBe("Wholesale");
  expect(columns[0].hidden).toBe(true);
  const onChange = vi.fn();
  render(<ExtensionFilter rows={rows} locale="en-GB" onChange={onChange} />, {
    wrapper: LocaleProvider,
  });
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Field" }),
    "app:context:details:count",
  );
  await userEvent.type(
    screen.getByRole("spinbutton", { name: "Exact value" }),
    "5",
  );
  await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(JSON.parse(onChange.mock.calls[0][0])).toEqual([
    { app: "context", entity: "details", field: "count", value: 5 },
  ]);
});

it("accepts omitted empty labels from the canonical Rust wire format", () => {
  const x = structuredClone(extension);
  delete (x as Partial<CoreExtension>).label;
  delete (x.model.fields[1] as Partial<(typeof x.model.fields)[number]>).label;
  expect(
    extensionColumns([{ id: "mug", extensions: [x] }], "de-DE")[0].label,
  ).toBe("details · segment");
  render(<CoreExtensions objectId="mug" extensions={[x]} request={vi.fn()} />, {
    wrapper: LocaleProvider,
  });
  expect(screen.getByRole("textbox", { name: "segment" })).toHaveValue(
    "Wholesale",
  );
});

it("keeps newly discovered optional fields hidden and preserves an explicitly shown app column", () => {
  const ids = ["name", "app:context:details:segment"];
  expect(
    normalizeLayout(ids, [ids[1]], { order: ["name"], hidden: [] }),
  ).toMatchObject({ order: ids, hidden: [ids[1]] });
  expect(
    normalizeLayout(ids, [ids[1]], { order: ids, hidden: [] }),
  ).toMatchObject({ order: ids, hidden: [] });
});

it("binding a draft never overwrites an existing business field with a native anchor", () => {
  const m = template();
  m.entities[0].fields.push({
    name: "native_id",
    kind: "string",
    label: { en: "Supplier number" },
  });
  const next = bindExtension(m.entities[0], "product");
  expect(next.fields.find((f) => f.name === "native_id")).toEqual(
    m.entities[0].fields.at(-1),
  );
  expect(next.extends?.field).not.toBe("native_id");
});

it("shares the native language picker while preserving canonical regional keys and a Spanish main-language fallback", () => {
  const x = structuredClone(extension);
  x.language.mainLocale = "es-ES";
  x.model.fields.push({
    name: "note",
    kind: "string",
    label: { en: "Note" },
    translatable: true,
  });
  x.record!.note = { "es-ES": "Texto de origen" };
  render(
    <ContentLanguage
      locales={["es", "en", "de", "fr", "it"]}
      mainLocale="es"
      language="it"
    >
      <ContentLanguagePicker />
      <CoreExtensions objectId="mug" extensions={[x]} request={vi.fn()} />
    </ContentLanguage>,
    { wrapper: LocaleProvider },
  );
  expect(
    screen.getAllByRole("combobox", { name: "Content language" }),
  ).toHaveLength(1);
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveAttribute(
    "placeholder",
    "Texto de origen",
  );
});
