/** Grid criteria use native reads; AI suggestions require review and stale requests cannot repaint. */
import { useState } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import AgenticGrid from "../../src/shared/grid/AgenticGrid";
import CustomerDirectory from "../../src/admin/customers/CustomerDirectory";
import { useGridPage } from "../../src/shared/grid/useGridPage";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { GridCriteria } from "../../src/shared/grid/types";
import { normalizeLayout, moveColumn } from "../../src/shared/grid/preferences";
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("rac-locale", "en-GB");
});
const columns = [
  {
    id: "name",
    label: "Name",
    sort: "name",
    render: (r: { id: string; name: string }) => r.name,
  },
  {
    id: "number",
    label: "Number",
    sort: "number",
    render: (r: { id: string; name: string }) => r.id,
  },
];
function Demo({
  request = vi.fn(),
  enabled = true,
}: {
  request?: any;
  enabled?: boolean;
}) {
  const [criteria, setCriteria] = useState<GridCriteria>({});
  return (
    <>
      <output data-testid="criteria">{JSON.stringify(criteria)}</output>
      <AgenticGrid
        id="fixture"
        title="Fixture grid"
        columns={columns}
        rows={[{ id: "42", name: "Alex" }]}
        rowKey={(r) => r.id}
        criteria={criteria}
        onCriteria={setCriteria}
        filters={[{ key: "customer", label: "Customer" }]}
        agent={{ entity: "orders", request, enabled }}
      />
    </>
  );
}
it("sorts filters and persists only column layout", async () => {
  const user = userEvent.setup();
  const view = render(<Demo />, { wrapper: LocaleProvider });
  await user.click(screen.getByRole("button", { name: /^Name/ }));
  expect(screen.getByTestId("criteria")).toHaveTextContent('"sort":"name"');
  await user.click(screen.getByRole("button", { name: /^Name/ }));
  expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await user.click(screen.getByRole("button", { name: "Filters" }));
  await user.type(screen.getByLabelText("Customer"), "Private Buyer");
  await user.click(screen.getByText("Columns", { selector: "summary" }));
  await user.click(screen.getByRole("button", { name: "Move left: Number" }));
  expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Number");
  const stored = Object.values(localStorage);
  expect(JSON.stringify(stored)).not.toContain("Private Buyer");
  view.unmount();
  render(<Demo />, { wrapper: LocaleProvider });
  expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Number");
});
it("supports drag headers without changing search criteria", () => {
  render(<Demo />, { wrapper: LocaleProvider });
  const headers = screen.getAllByRole("columnheader");
  fireEvent.dragStart(headers[1], { dataTransfer: { setData: vi.fn() } });
  fireEvent.dragOver(headers[0]);
  fireEvent.drop(headers[0]);
  expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Number");
  expect(screen.getByTestId("criteria")).toHaveTextContent("{}");
});
it("closes column controls explicitly, on Escape and outside without hiding a column", async () => {
  const user = userEvent.setup();
  render(<Demo />, { wrapper: LocaleProvider });
  const trigger = screen.getByText("Columns", { selector: "summary" });
  const menu = trigger.closest("details")!;
  await user.click(trigger);
  expect(menu.open).toBe(true);
  await user.click(screen.getByRole("button", { name: "Close columns" }));
  expect(menu.open).toBe(false);
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.keyboard("{Escape}");
  expect(menu.open).toBe(false);
  await user.click(trigger);
  await user.click(screen.getByTestId("criteria"));
  expect(menu.open).toBe(false);
  expect(screen.getAllByRole("columnheader")).toHaveLength(2);
});
it("reviews planner filters before applying and rejects identity fields", async () => {
  const user = userEvent.setup();
  const request = vi
    .fn()
    .mockResolvedValueOnce({ supported: true, criteria: { customer: "Alex" } })
    .mockResolvedValueOnce({
      supported: true,
      criteria: { tenant: "foreign" },
    });
  render(<Demo request={request} />, { wrapper: LocaleProvider });
  await user.click(screen.getByRole("button", { name: "Ask your list" }));
  await user.type(
    screen.getByLabelText("Describe what you want to find"),
    "Show all orders from Alex",
  );
  await user.click(screen.getByRole("button", { name: "Create filters" }));
  await screen.findByText("Review your filters");
  expect(screen.getByTestId("criteria")).toHaveTextContent("{}");
  expect(request).toHaveBeenCalledWith("/api/merchant/grid/plan", {
    entity: "orders",
    instruction: "Show all orders from Alex",
    locale: "en-GB",
  });
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(screen.getByTestId("criteria")).toHaveTextContent('"customer":"Alex"');
  await user.click(screen.getByRole("button", { name: "Ask your list" }));
  await user.click(screen.getByRole("button", { name: "Create filters" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", { name: "Apply filters" })).toBeNull();
});
it("does not offer AI without its current right", () => {
  render(<Demo enabled={false} />, { wrapper: LocaleProvider });
  expect(screen.queryByRole("button", { name: "Ask your list" })).toBeNull();
});
it("renders the customer group with the native translated vocabulary", async () => {
  const request = vi.fn().mockResolvedValue({ elements: [] });
  render(
    <CustomerDirectory
      request={request}
      groups={[]}
      groupName={(id) => id}
      onOpen={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  expect(
    screen.getByRole("columnheader", { name: "Customer group" }),
  ).toBeVisible();
  await waitFor(() => expect(request).toHaveBeenCalled());
});
it("clears rows on errors and ignores a superseded response", async () => {
  let resolveOld: (v: any) => void = () => {};
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveOld = r;
        }),
    )
    .mockResolvedValueOnce({ elements: [{ id: "new", name: "New" }] })
    .mockRejectedValueOnce(new Error("denied"));
  function Page() {
    const page = useGridPage(request, "/api/merchant/customers");
    return (
      <AgenticGrid
        id="page"
        title="Page"
        {...page}
        columns={columns}
        rowKey={(r) => r.id}
      />
    );
  }
  const user = userEvent.setup();
  render(<Page />, { wrapper: LocaleProvider });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await user.type(screen.getByRole("searchbox"), "new");
  await screen.findByText("New");
  resolveOld({ elements: [{ id: "old", name: "Old private" }] });
  await waitFor(() => expect(screen.queryByText("Old private")).toBeNull());
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("New")).toBeNull();
});
it("sanitizes removed columns and leaves one visible", () => {
  const v = normalizeLayout(["a", "b"], [], {
    order: ["gone", "b", "b"],
    hidden: ["gone", "a", "b"],
    compact: true,
  });
  expect(v).toEqual({ order: ["b", "a"], hidden: ["a"], compact: true });
  expect(moveColumn(v, "a", "b").order).toEqual(["a", "b"]);
});

it("keeps details reachable when a primary column is hidden", async () => {
  const user = userEvent.setup(),
    open = vi.fn();
  render(
    <AgenticGrid
      id="actions"
      title="Action grid"
      rows={[{ id: "42", name: "Alex" }]}
      columns={columns}
      rowKey={(r) => r.id}
      criteria={{}}
      onCriteria={vi.fn()}
      onRow={open}
    />,
    { wrapper: LocaleProvider },
  );
  await user.click(screen.getByText("Columns", { selector: "summary" }));
  await user.click(screen.getByRole("checkbox", { name: "Show column: Name" }));
  expect(screen.queryByRole("columnheader", { name: /^Name/ })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Open details" }));
  expect(open).toHaveBeenCalledWith({ id: "42", name: "Alex" });
});

it("shows meaningful false-valued filters instead of hiding an inactive constraint", () => {
  render(
    <AgenticGrid
      id="false"
      title="Boolean grid"
      rows={[]}
      columns={columns}
      rowKey={(r) => r.id}
      criteria={{ active: false }}
      onCriteria={vi.fn()}
      filters={[
        {
          key: "active",
          label: "Status",
          options: [{ value: "false", label: "Inactive" }],
        },
      ]}
    />,
    { wrapper: LocaleProvider },
  );
  expect(
    screen.getByRole("button", { name: /Status: Inactive/ }),
  ).toBeVisible();
});
