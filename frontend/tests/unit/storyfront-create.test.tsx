/** Hosted entry sends identifiers only and uses current named rights, including for custom roles. */
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import StoryfrontCreate from "../../../extensions/apps/storyfront/studio/StoryfrontCreate";
import { storyfrontCreateURL } from "../../../extensions/apps/storyfront/studio/storyfront-create";
it("offers original Storyfront creation for a permitted custom role without installing on read", async () => {
  localStorage.setItem("rac-locale", "de-DE");
  vi.stubEnv("VITE_EXPERIENCE_ORIGIN", "https://experience.veyndo.ai");
  const request = vi.fn(async (path: string) =>
    path === "/api/merchant/commerce"
      ? { data: { mainLocale: "en-GB" } }
      : {
          channels: [
            {
              id: "online",
              data: {
                kind: "storefront",
                active: true,
                name: { "en-GB": "Online" },
              },
            },
            {
              id: "private",
              data: { kind: "storefront", active: true, visibility: "private" },
            },
          ],
        },
  );
  render(
    <LocaleProvider>
      <StoryfrontCreate
        request={request}
        workspace="own-shop"
        rights={[
          "apps.manage",
          "channels.manage",
          "settings.write",
          "settings.read",
          "catalog.read",
        ]}
      />
    </LocaleProvider>,
  );
  const link = await screen.findByRole("link", {
    name: "Experience erstellen",
  });
  expect(link).toHaveAttribute(
    "href",
    "https://experience.veyndo.ai/connect?shop=own-shop&channel=online&locale=de-DE",
  );
  expect(screen.getByRole("option", { name: "Online" })).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "private" }),
  ).not.toBeInTheDocument();
  expect(request.mock.calls).toEqual([
    ["/api/automation"],
    ["/api/merchant/commerce"],
  ]);
  vi.unstubAllEnvs();
  localStorage.setItem("rac-locale", "en-GB");
});
it("withholds creation from read-only users and rejects unsafe self-hosted origins", () => {
  const request = vi.fn();
  render(
    <LocaleProvider>
      <StoryfrontCreate
        request={request}
        workspace="own-shop"
        rights={["apps.read"]}
      />
    </LocaleProvider>,
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
  vi.stubEnv("VITE_EXPERIENCE_ORIGIN", "https://user:secret@evil.test");
  expect(
    storyfrontCreateURL("own", "online", "de-DE", "app.veyndo.ai"),
  ).toBeUndefined();
  vi.stubEnv("VITE_EXPERIENCE_ORIGIN", "");
  expect(
    storyfrontCreateURL("own", "online", "de-DE", "localhost"),
  ).toBeUndefined();
  vi.unstubAllEnvs();
});
