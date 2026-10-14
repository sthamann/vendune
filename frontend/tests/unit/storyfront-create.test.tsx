/** Hosted entry sends identifiers only and uses current named rights, including for custom roles. */
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import StoryfrontCreate from "../../../extensions/apps/storyfront/studio/StoryfrontCreate";
import { storyfrontCreateURL } from "../../../extensions/apps/storyfront/studio/storyfront-create";
it("offers original Storyfront creation for a permitted custom role without installing on read", async () => {
  vi.stubEnv("VITE_EXPERIENCE_ORIGIN", "https://experience.veyndo.ai");
  const request = vi.fn(async () => ({
    channels: [
      {
        id: "online",
        data: { kind: "storefront", active: true, name: { "en-GB": "Online" } },
      },
      {
        id: "private",
        data: { kind: "storefront", active: true, visibility: "private" },
      },
    ],
  }));
  render(
    <LocaleProvider>
      <StoryfrontCreate
        request={request}
        workspace="own-shop"
        rights={["apps.manage", "channels.manage", "settings.write"]}
      />
    </LocaleProvider>,
  );
  const link = await screen.findByRole("link", {
    name: "Create an experience",
  });
  expect(link).toHaveAttribute(
    "href",
    "https://experience.veyndo.ai/connect?shop=own-shop&channel=online&locale=en-GB",
  );
  expect(
    screen.queryByRole("option", { name: "private" }),
  ).not.toBeInTheDocument();
  expect(request.mock.calls).toEqual([["/api/automation"]]);
  vi.unstubAllEnvs();
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
