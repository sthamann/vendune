/** Business entry uses the real customer login and retains its destination; no shared demo identity. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import Storefront from "../../src/storefront/shell/Storefront";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { acceptCustomerSession } from "../../src/shared/api/customer-session";
import { cart } from "./fixtures";

function storefrontFixture(signed = false) {
  if (signed)
    acceptCustomerSession("unit-shop", {
      customerToken: "own-customer-session",
    });
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    const values: Record<string, unknown> = {
      "/store-api/company": { data: {} },
      "/store-api/checkout/cart": cart,
      "/api/experience": { variant: "control" },
      "/store-api/apps/surfaces": { surfaces: [] },
      "/api/apps/surfaces": { surfaces: [] },
      "/store-api/legal": {
        policyVersion: "fixture-policy",
        data: { purposes: {} },
      },
      "/store-api/privacy/consent": {
        decided: true,
        policyVersion: "fixture-policy",
        choices: {},
      },
      "/store-api/account/profile": {
        id: "own-buyer",
        email: "own-buyer@example.test",
        customerNumber: "C-OWN",
        revision: 1,
        profile: { name: "Own Buyer" },
      },
      "/store-api/checkout/options": { countries: ["DE"], payments: [] },
      "/store-api/account/downloads": { elements: [] },
      "/store-api/account/orders": { elements: [] },
      "/store-api/b2b/contexts": {
        elements: [],
        mainLocale: "en-GB",
        locales: ["en-GB"],
      },
    };
    if (path === "/store-api/account/login") {
      const submitted = JSON.parse(String(init?.body));
      return {
        ok: submitted.email === "own-buyer@example.test",
        status: submitted.email === "own-buyer@example.test" ? 200 : 401,
        json: async () =>
          submitted.email === "own-buyer@example.test"
            ? {
                ...cart,
                token: "own-rotated-cart",
                customerToken: "own-customer-session",
              }
            : { errors: [{ detail: "Invalid credentials" }] },
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => values[path] ?? { elements: [] },
    };
  });
  vi.stubGlobal("fetch", fetcher);
  history.replaceState(null, "", "/?shop=unit-shop");
  render(<Storefront onMerchant={vi.fn()} />, { wrapper: LocaleProvider });
  return fetcher;
}

it("opens sign-in from business entry without trying demo credentials", async () => {
  const fetcher = storefrontFixture();
  const business = await screen.findByRole("button", {
    name: "Business account",
  });
  await waitFor(() => expect(business).toBeEnabled());
  await userEvent.click(business);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("");
  expect(
    fetcher.mock.calls.some(([path]) => path === "/store-api/account/login"),
  ).toBe(false);
  await userEvent.click(screen.getByRole("button", { name: "Close account" }));
  await userEvent.click(screen.getByRole("button", { name: "My account" }));
  expect(await screen.findByLabelText("Email")).toHaveValue("");
  expect(
    fetcher.mock.calls.some(([path]) => path === "/store-api/account/login"),
  ).toBe(false);
});

it.each([false, true])(
  "opens company purchasing with the buyer's own session (already signed=%s)",
  async (signed) => {
    const fetcher = storefrontFixture(signed);
    const user = userEvent.setup();
    const business = await screen.findByRole("button", {
      name: "Business account",
    });
    await waitFor(() => expect(business).toBeEnabled());
    await user.click(business);
    if (!signed) {
      await user.type(
        await screen.findByLabelText("Email"),
        "own-buyer@example.test",
      );
      await user.type(screen.getByLabelText("Password"), "Synthetic-own-2026!");
      await user.click(
        screen.getAllByRole("button", { name: /Sign in/ }).at(-1)!,
      );
    }
    expect(
      await screen.findByText(
        "Your merchant can enable company access for this customer account.",
      ),
    ).toBeInTheDocument();
    const login = fetcher.mock.calls.filter(
      ([path]) => path === "/store-api/account/login",
    );
    expect(login).toHaveLength(signed ? 0 : 1);
    if (!signed)
      expect(JSON.parse(String(login[0][1]?.body))).toEqual({
        email: "own-buyer@example.test",
        password: "Synthetic-own-2026!",
      });
    const contexts = fetcher.mock.calls.find(
      ([path]) => path === "/store-api/b2b/contexts",
    );
    expect(new Headers(contexts?.[1]?.headers).get("x-customer-token")).toBe(
      "own-customer-session",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close account" }));
    await user.click(screen.getByRole("button", { name: "My account" }));
    expect(await screen.findByText(/C-OWN/)).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Your merchant can enable company access for this customer account.",
      ),
    ).not.toBeInTheDocument();
  },
);
