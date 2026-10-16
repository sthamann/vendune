/** Recipes and proposals verify native bindings and explicit AI review without payment side effects. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { appRecipe, recipeIds } from "../../src/admin/developer/app-recipes";
import AppRecipes from "../../src/admin/developer/AppRecipes";
import AppCanvas from "../../src/admin/developer/AppCanvas";
import AppProposalReview from "../../src/admin/developer/AppProposalReview";
import { proposalChanges } from "../../src/admin/developer/app-proposal";
import {
  compile,
  newBlock,
  problems,
} from "../../src/admin/developer/app-model";
import { inheritedContext } from "../../src/admin/developer/control-model";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { AppStudio } from "../../src/admin/developer/useAppStudio";
import NativeAppView from "../../src/shared/apps/native/NativeAppView";
import ProposalCard from "../../src/admin/assistant/ProposalCard";
import type { Message } from "../../src/admin/shell/studio-types";
for (const kind of recipeIds)
  it(`compiles the ${kind} pattern with explicit access and bindings`, () => {
    const m = appRecipe(kind, `test_${kind}`);
    expect(problems(m)).toBe(false);
    expect(compile(m)).toEqual(m);
    if (kind === "edi") {
      expect(m.runtime).toBe("service");
      expect(m.entities.every((e) => !e.publicRead)).toBe(true);
      expect(
        m.actions?.find((a) => a.name === "export_document"),
      ).toMatchObject({
        handler: "service",
        readOnly: true,
        mcp: true,
        public: false,
      });
      expect(
        m.entities
          .flatMap((e) => e.fields)
          .some((f) => f.coreReference === "b2bUnit"),
      ).toBe(true);
    } else if (kind === "furniture") {
      expect(m.configuration?.inputs?.examples?.length).toBe(7);
      expect(m.configuration?.inputs?.recordField).toBe("material");
      expect(m.actions?.find((a) => a.name === "configure")).toMatchObject({
        handler: "configure",
        public: true,
        readOnly: false,
        mcp: true,
      });
      expect(
        m.views?.some((v) =>
          v.blocks.some(
            (b) => b.kind === "form" && b.writeAction === "save_materials",
          ),
        ),
      ).toBe(true);
    } else {
      expect(
        m.views?.some(
          (v) =>
            v.layout === "form" &&
            v.blocks.some((b) =>
              b.handlers?.click?.some((s) => s.op === "call"),
            ),
        ),
      ).toBe(true);
      expect(m.actions?.every((a) => a.mcp === false)).toBe(true);
    }
    expect(
      m.actions
        ?.filter((a) => a.public)
        .every(
          (a) =>
            a.readOnly || (kind === "furniture" && a.handler === "configure"),
        ),
    ).toBe(true);
    if (kind === "returns") {
      expect(m.entities[0].publicRead).toBe(false);
      expect(m.surfaces![0].location).toBe("admin.order");
    }
    if (kind === "erp") {
      expect(m.runtime).toBe("service");
      expect(m.events).toEqual(["order.placed"]);
    }
  });
it("opens an editable pattern and explains external ERP prerequisites", async () => {
  const onCreate = vi.fn();
  render(<AppRecipes onCreate={onCreate} />, { wrapper: LocaleProvider });
  await userEvent.click(screen.getByRole("button", { name: /ERP handoff/ }));
  expect(onCreate.mock.calls[0][0].events).toEqual(["order.placed"]);
  expect(
    screen.getByText(/external ERP service must be deployed separately/),
  ).toBeVisible();
});
it("requires explicit AI review and denies applying after a concurrent draft edit", async () => {
  const before = appRecipe("returns", "returns"),
    after = structuredClone(before);
  after.version = "0.1.1";
  after.entities[0].fields.push({
    name: "approved",
    label: { en: "Approved" },
    kind: "boolean",
  });
  const studio = {
    manifest: before,
    mainLocale: "en-GB",
    busy: false,
    proposal: {
      base: JSON.stringify(before),
      build: { manifest: after, summary: { en: "Add approval" } },
    },
    acceptProposal: vi.fn(),
    discardProposal: vi.fn(),
  } as unknown as AppStudio;
  const { rerender } = render(<AppProposalReview studio={studio} />, {
    wrapper: LocaleProvider,
  });
  expect(studio.acceptProposal).not.toHaveBeenCalled();
  expect(proposalChanges(before, after).some((c) => c.group === "models")).toBe(
    true,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Use this proposal" }),
  );
  expect(studio.acceptProposal).toHaveBeenCalledOnce();
  studio.manifest = { ...before, version: "0.1.2" };
  rerender(<AppProposalReview studio={studio} />);
  expect(
    screen.getByRole("button", { name: "Use this proposal" }),
  ).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(/draft changed/);
  await userEvent.click(
    screen.getByRole("button", { name: "Keep my current draft" }),
  );
  expect(studio.discardProposal).toHaveBeenCalledOnce();
});
it("saves returns through the native order-bound gateway without issuing a refund", async () => {
  const m = appRecipe("returns", "returns"),
    surface = m.surfaces![0],
    view = m.views!.find((v) => surface.uiPath === `native/${v.id}`)!;
  const request = vi.fn(async (path: string) =>
    path.endsWith("list_entries")
      ? { elements: [] }
      : { id: "case", revision: 1 },
  );
  render(
    <NativeAppView
      app={m.id}
      native={{ view, entities: m.entities }}
      request={request}
      allowedActions={surface.actions}
      context={{ orderId: "owned-order" }}
    />,
    { wrapper: LocaleProvider },
  );
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Title"), "Damaged item");
  await user.selectOptions(screen.getByLabelText("Status"), "new");
  expect(screen.getAllByRole("button", { name: "Save record" })).toHaveLength(
    1,
  );
  await user.click(screen.getByRole("button", { name: "Save record" }));
  expect(request).toHaveBeenCalledWith(
    "/api/apps/returns/actions/save_entries",
    expect.objectContaining({
      fields: expect.objectContaining({
        order_id: "owned-order",
        status: "new",
      }),
    }),
  );
  expect(request.mock.calls.every(([p]) => !p.includes("refund"))).toBe(true);
  expect(
    request.mock.calls.filter(([p]) => p.endsWith("save_entries")),
  ).toHaveLength(1);
});
it("advances confirmed return states with one save per transition without reopening the page", async () => {
  const m = appRecipe("returns", "returns"),
    surface = m.surfaces![0];
  const view = m.views!.find((v) => surface.uiPath === `native/${v.id}`)!;
  let revision = 0;
  const request = vi.fn(async (path: string) =>
    path.endsWith("list_entries")
      ? { elements: [] }
      : { id: "case", revision: ++revision },
  );
  render(
    <NativeAppView
      app={m.id}
      native={{ view, entities: m.entities }}
      request={request}
      allowedActions={surface.actions}
      context={{ orderId: "owned-order" }}
    />,
    { wrapper: LocaleProvider },
  );
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Title"), "Size exchange");
  await user.click(screen.getByRole("button", { name: "Save record" }));
  for (const status of ["review", "received", "closed"]) {
    await user.selectOptions(screen.getByLabelText("Status"), status);
    await user.click(screen.getByRole("button", { name: "Save record" }));
  }
  expect(
    request.mock.calls.filter(([p]) => p.endsWith("save_entries")),
  ).toHaveLength(4);
  expect(screen.getByLabelText("Status")).toHaveValue("closed");
  expect(
    screen.queryByRole("option", { name: "Under review" }),
  ).not.toBeInTheDocument();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Record" }),
    "",
  );
  expect(screen.getByLabelText("Status")).toHaveValue("new");
});
it("new visual controls retain the owned order filter and never fetch without host context", async () => {
  const m = appRecipe("returns", "returns"),
    view = m.views![0];
  const control = {
    ...newBlock("textbox", view, "entries"),
    dataField: "notes",
  };
  expect(control.contextBinding).toEqual({ field: "order_id", key: "orderId" });
  const request = vi.fn(async () => ({ elements: [] }));
  const props = {
    app: m.id,
    native: { view: { ...view, blocks: [control] }, entities: m.entities },
    request,
    allowedActions: ["list_entries"],
  };
  const { rerender } = render(<NativeAppView {...props} context={{}} />, {
    wrapper: LocaleProvider,
  });
  expect(request).not.toHaveBeenCalled();
  rerender(<NativeAppView {...props} context={{ orderId: "owned-order" }} />);
  await screen.findByText(/0 ·/);
  expect(request).toHaveBeenCalledWith(
    "/api/apps/returns/actions/list_entries",
    { limit: 50, filter: { order_id: "owned-order" } },
  );
});
it("does not inherit another model's or an ambiguous object's binding", () => {
  const view = appRecipe("returns", "returns").views![0];
  expect(inheritedContext(view, "other_model")).toBeNull();
  const ambiguous = {
    ...view,
    blocks: [
      ...view.blocks,
      {
        ...view.blocks[0],
        id: "different",
        contextBinding: { field: "other_order_id", key: "orderId" as const },
      },
    ],
  };
  expect(inheritedContext(ambiguous, "entries")).toBeNull();
  expect(newBlock("text", view, "entries").contextBinding).toBeUndefined();
});
it("palette controls default to content fields while retaining the order context", async () => {
  const m = appRecipe("returns", "returns"),
    onChange = vi.fn();
  render(
    <AppCanvas
      manifest={m}
      view={m.views![0]}
      selected=""
      onSelect={() => {}}
      onChange={onChange}
      mainLocale="en-GB"
      preview={false}
      previewRequest={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  await userEvent.click(screen.getByRole("button", { name: "Text input" }));
  const added = onChange.mock.calls[0][0].views[0].blocks.at(-1);
  expect(added.dataField).toBe("title");
  expect(added.contextBinding).toEqual({ field: "order_id", key: "orderId" });
});
it("links an approved translation to the same shop and its existing job review", () => {
  const original = location.href;
  history.replaceState(null, "", "/?shop=owned&channel=french#merchant");
  const message = {
    applied: false,
    data: {
      taskId: "job-owned",
      preview: {
        proposal: { changes: [], translation: "fr-FR" },
        catalogBefore: [],
      },
    },
  } as unknown as Message;
  const { rerender } = render(
    <ProposalCard message={message} onApply={() => {}} busy={false} canApply />,
    { wrapper: LocaleProvider },
  );
  expect(screen.queryByRole("link")).toBeNull();
  message.applied = true;
  rerender(
    <ProposalCard message={message} onApply={() => {}} busy={false} canApply />,
  );
  const link = new URL(screen.getByRole("link").getAttribute("href")!);
  expect(link.searchParams.get("shop")).toBe("owned");
  expect(link.searchParams.get("channel")).toBe("french");
  expect(link.searchParams.get("settings")).toBe("languages");
  expect(link.searchParams.get("translationJob")).toBe("job-owned");
  history.replaceState(null, "", original);
});
