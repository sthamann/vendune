/** Creating organizations must satisfy the actual native identifier contract, including digit-led UUIDs. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import B2BWorkspace from "../../src/admin/b2b/B2BWorkspace";
vi.mock("../../src/shared/apps/AppSurfaces", () => ({
  AppSurfaceSlot: () => null,
}));
vi.mock("../../src/shared/history/EntityHistory", () => ({
  default: () => null,
}));
it("creates a company and unit with native-valid IDs from a digit-led UUID", async () => {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(
    "7405da42-f5c4-4993-8b48-76dd6a4e2a57",
  );
  const user = userEvent.setup();
  let company: any;
  const request = vi.fn(async (path: string, body: any) => {
    if (path.endsWith("/companies")) return { companies: [] };
    if (path.endsWith("/configuration"))
      return {
        mainLocale: "en-GB",
        locales: ["en-GB", "de-DE"],
        currencies: { defaultCurrency: "EUR", enabled: ["EUR"] },
        shipping: [],
        payments: [],
      };
    if (path.endsWith("/company.create") || path.endsWith("/unit.save")) {
      // Match apps::identifier instead of a permissive fake API.
      if (!/^[a-z][a-z0-9_]{0,31}$/.test(body.id))
        throw new Error("Valid company/unit ID required");
      if (path.endsWith("/company.create"))
        company = { ...body, revision: 1, units: [], members: [] };
      return { id: body.id, revision: 1 };
    }
    if (path.endsWith("/company")) return company;
    return { elements: [] };
  });
  render(<B2BWorkspace request={request as any} />, {
    wrapper: LocaleProvider,
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "New company" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "New company" }));
  await user.type(screen.getByLabelText("Name"), "Nord Business");
  await user.click(
    screen.getAllByRole("button", { name: "New company" }).at(-1)!,
  );
  await screen.findByRole("button", { name: "New purchasing unit" });
  expect(request).toHaveBeenCalledWith(
    "/api/b2b/company.create",
    expect.objectContaining({
      id: "b7405da42f5c449938b4876dd6a4e2a5",
      data: expect.objectContaining({ name: { "en-GB": "Nord Business" } }),
    }),
  );
  await user.click(screen.getByRole("button", { name: "New purchasing unit" }));
  await user.type(screen.getAllByLabelText("Name")[1], "Procurement");
  await user.click(screen.getAllByRole("button", { name: "Save changes" })[1]);
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/b2b/unit.save",
      expect.objectContaining({
        id: "b7405da42f5c449938b4876dd6a4e2a5",
        companyId: company.id,
        data: expect.objectContaining({ name: { "en-GB": "Procurement" } }),
      }),
    ),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
