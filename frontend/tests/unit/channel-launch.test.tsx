/** Channel launch stays in the current authenticated workspace and passes its canonical channel ID. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import AppsManager from "../../src/admin/apps/AppsManager";

it("opens the marketplace workspace from an app deep link instead of dropping into the app store", async () => {
  history.replaceState(
    null,
    "",
    "/?studio=apps&app=marketplaces&channel=market-1",
  );
  const request = vi.fn(async (path: string) => {
    if (path === "/api/apps")
      return {
        packages: [
          {
            id: "marketplaces",
            active: true,
            revision: 1,
            version: "1",
            manifest: {
              name: { en: "Marketplace Studio" },
              permissions: [],
              entities: [],
              actions: [],
              slots: [],
            },
          },
        ],
      };
    if (path.endsWith("secrets")) return { kinds: [], secrets: [] };
    if (path.endsWith("activity"))
      return { calls: [], deliveries: [], storage: null };
    if (path.endsWith("credentials")) return { permissions: [], keys: [] };
    if (path.includes("jobs")) return { jobs: [] };
    if (path === "/api/automation")
      return {
        channels: [
          {
            id: "market-1",
            data: {
              kind: "marketplace",
              locales: ["en-GB"],
              name: { en: "Market" },
            },
          },
        ],
      };
    return { elements: [] };
  });
  render(
    <LocaleProvider>
      <AppsManager
        request={request}
        token=""
        role="owner"
        rights={["apps.manage"]}
      />
    </LocaleProvider>,
  );
  expect(
    await screen.findByRole("button", { name: /Connect marketplace/ }),
  ).toBeVisible();
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: /Connect marketplace/ }));
  await waitFor(() =>
    expect(screen.getByLabelText("Marketplace sales channel")).toHaveValue(
      "market-1",
    ),
  );
});

it("creates a marketplace channel, marks its missing name and opens its app in place with the channel preselected", async () => {
  const { default: SalesChannelsWorkspace } =
    await import("../../src/admin/channels/SalesChannelsWorkspace");
  let created: any;
  const request = vi.fn(async (path: string, body?: any) => {
    if (path.startsWith("/api/automation/channels/") && body) {
      created = { id: path.split("/").at(-1), revision: 1, data: body.data };
      return { revision: 1 };
    }
    if (path === "/api/auth/access")
      return { permissions: ["channels.manage", "apps.read", "apps.manage"] };
    if (path === "/api/merchant/commerce")
      return {
        data: { mainLocale: "de-DE", locales: ["de-DE"], countries: ["DE"] },
      };
    if (path === "/api/merchant/categories") return { elements: [] };
    if (path === "/api/automation")
      return {
        channels: [
          ...(created ? [created] : []),
          {
            id: "existing",
            revision: 1,
            data: {
              kind: "marketplace",
              name: { "de-DE": "Existing" },
              locales: ["de-DE"],
              productIds: [],
            },
          },
        ],
      };
    if (path === "/api/apps")
      return { packages: [{ id: "marketplaces", active: true, revision: 1 }] };
    if (path.endsWith("jobs")) return { jobs: [] };
    return { elements: [], countries: [] };
  });
  const open = vi.spyOn(window, "open");
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <SalesChannelsWorkspace
        request={request}
        workspace="own-shop"
        onTeam={vi.fn()}
      />
    </LocaleProvider>,
  );
  await user.click(
    await screen.findByRole("button", { name: /Create sales channel/ }),
  );
  await user.click(screen.getByRole("button", { name: /^Marketplace / }));
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Channel name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await user.type(screen.getByLabelText("Channel name"), "Online market");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(
    screen.getByRole("button", { name: "Create sales channel" }),
  );
  await screen.findByText("Channel saved");
  await user.click(
    screen.getByRole("button", { name: "Open Marketplace Studio" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Connect marketplace" }),
  );
  const channel = request.mock.calls
    .find(
      ([path, body]) => path.startsWith("/api/automation/channels/") && body,
    )?.[0]
    .split("/")
    .at(-1);
  // The native channel list is re-read before the existing connection selector can accept it.
  expect(request.mock.calls.some(([path]) => path === "/api/automation")).toBe(
    true,
  );
  expect(channel).toMatch(/^shop_/);
  await waitFor(() =>
    expect(screen.getByLabelText("Marketplace sales channel")).toHaveValue(
      channel,
    ),
  );
  expect(open).not.toHaveBeenCalled();
});
