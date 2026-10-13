/** The shared role editor shows readable scopes, prevents broader delegation and saves one locale at a time. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import RolesManager from "../../src/admin/team/RolesManager";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
vi.mock("../../src/shared/history/EntityHistory", () => ({
  default: () => null,
}));
it("creates a localized reusable role and disables permissions the delegate does not hold", async () => {
  const request = vi.fn(async (path: string, body?: any, _method?: string) =>
    path === "/api/workspace/roles"
      ? { elements: [], mainLocale: "en-GB", locales: ["en-GB", "de-DE"] }
      : path === "/api/auth/access"
        ? {
            available: ["catalog.read", "payments.manage"],
            permissions: ["team.manage", "catalog.read"],
          }
        : body
          ? { revision: 1 }
          : {},
  );
  render(<RolesManager request={request} />, { wrapper: LocaleProvider });
  const user = userEvent.setup();
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/workspace/roles"),
  );
  await user.click(screen.getByRole("button", { name: "Create role" }));
  await user.type(screen.getByLabelText("Role name"), "Stock desk");
  await user.click(screen.getByRole("checkbox", { name: /catalog.read/ }));
  expect(
    screen.getByRole("checkbox", { name: /payments.manage/ }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Save role" }));
  await waitFor(() =>
    expect(
      request.mock.calls.some(
        (c) =>
          c[2] === "PUT" &&
          c[1]?.data?.name?.["en-GB"] === "Stock desk" &&
          c[1]?.data?.permissions.join() === "catalog.read",
      ),
    ).toBe(true),
  );
  expect(screen.getAllByLabelText("Role name")).toHaveLength(1);
});
