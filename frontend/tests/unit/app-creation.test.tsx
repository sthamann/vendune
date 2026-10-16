/** Guided creation keeps placement limits, keyboard selection, localized names and advanced validation usable. */
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import AppAssistant from "../../src/admin/developer/AppAssistant";
import { placements } from "../../src/admin/developer/assistant-model";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocaleProvider>
    <ContentLanguage locales={["en-GB", "sv-SE"]} mainLocale="sv-SE">
      {children}
    </ContentLanguage>
  </LocaleProvider>
);
it("groups every registered placement and enforces the six-area limit without trapping deselection", async () => {
  const user = userEvent.setup();
  render(<AppAssistant onCreate={vi.fn()} onClose={vi.fn()} />, { wrapper });
  await user.click(
    screen.getByRole("button", { name: /Connected experience/ }),
  );
  const picker = screen.getByRole("group", { name: "Where should it appear?" });
  const checks = within(picker).getAllByRole("checkbox");
  expect(checks).toHaveLength(Object.keys(placements).length);
  for (const group of [
    "Shop & content",
    "Purchase & account",
    "Administration",
    "Point of sale",
    "Company purchasing",
  ])
    expect(within(picker).getByRole("group", { name: group })).toBeVisible();
  const free = checks.filter((el) => !(el as HTMLInputElement).checked);
  for (const el of free.slice(0, 5)) await user.click(el);
  expect(screen.getByText("6 of 6 selected")).toBeVisible();
  expect(free[5]).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "Remove Product detail" }),
  );
  expect(free[5]).toBeEnabled();
  expect(screen.getByLabelText("Product detail")).not.toBeChecked();
});
it("explains an empty selection and does not create a broken draft", async () => {
  const user = userEvent.setup(),
    create = vi.fn();
  render(<AppAssistant onCreate={create} onClose={vi.fn()} />, { wrapper });
  await user.click(screen.getByRole("button", { name: /Storefront app/ }));
  await user.click(
    screen.getByRole("button", { name: "Remove Product detail" }),
  );
  expect(
    screen.getByRole("button", { name: "Create editable draft" }),
  ).toBeDisabled();
  expect(
    screen.getByText("Choose at least one area to continue."),
  ).toBeVisible();
  expect(create).not.toHaveBeenCalled();
});
it("keeps regional language edits and keyboard-selected locations in the generated normal manifest", async () => {
  const user = userEvent.setup(),
    create = vi.fn();
  render(<AppAssistant onCreate={create} onClose={vi.fn()} />, { wrapper });
  await user.click(screen.getByRole("button", { name: /Storefront app/ }));
  await user.selectOptions(screen.getByLabelText("Content language"), "sv-SE");
  await user.clear(screen.getByLabelText("App name"));
  await user.type(screen.getByLabelText("App name"), "Materialråd");
  screen.getByLabelText("Global header banner").focus();
  await user.keyboard(" ");
  await user.click(
    screen.getByRole("button", { name: "Create editable draft" }),
  );
  const m = create.mock.calls[0][0];
  expect(m.name["sv-SE"]).toBe("Materialråd");
  expect(m.surfaces.map((s: any) => s.location)).toEqual(
    expect.arrayContaining(["product.detail", "storefront.header"]),
  );
  expect(m.actions.every((a: any) => !a.mcp)).toBe(true);
});
it("opens optional technical controls when their ID fails native validation", async () => {
  const user = userEvent.setup();
  render(<AppAssistant onCreate={vi.fn()} onClose={vi.fn()} />, { wrapper });
  await user.click(screen.getByRole("button", { name: /Storefront app/ }));
  const id = screen.getByLabelText(/Technical app ID/),
    details = id.closest("details")!;
  expect(details).not.toHaveAttribute("open");
  fireEvent.invalid(id);
  expect(details).toHaveAttribute("open");
  expect(
    screen.getByLabelText("Expose action to MCP / agents"),
  ).not.toBeChecked();
});
