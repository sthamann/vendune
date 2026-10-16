/** Explicit resume never adopts another account or replays a write. */
import { expect, it, vi } from "vitest";
import { resumeBrowserSession } from "../../src/admin/shell/resume-browser-session";
import {
  activateBrowserSession,
  browserSessionScope,
} from "../../src/shared/api/browser-session";
import { session } from "./fixtures";
function candidate(value: string) {
  document.cookie = `veyndo-csrf=${value.repeat(64)}; Path=/`;
}
function reply(overrides: object = {}) {
  return new Response(
    JSON.stringify({ ...session, token: "browser-session", ...overrides }),
  );
}
it("reads the native ledger on explicit resume without adopting its identity", async () => {
  activateBrowserSession({ browserSession: true, browserCsrf: "a".repeat(64) });
  candidate("b");
  const fetcher = vi.fn(async () => reply());
  vi.stubGlobal("fetch", fetcher);
  const result = await resumeBrowserSession(
    session.user.id,
    "unit-shop",
    "Refused",
  );
  expect(result.browserCsrf).toBe("b".repeat(64));
  expect(browserSessionScope()).toBe("a".repeat(64));
  expect(fetcher).toHaveBeenCalledExactlyOnceWith(
    "/api/auth/session",
    expect.objectContaining({
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "x-veyndo-browser-session": "1",
        "x-veyndo-csrf": "b".repeat(64),
        "x-tenant": "unit-shop",
      },
    }),
  );
});
it.each([
  { user: { ...session.user, id: "other" } },
  { workspaces: [] },
  { token: "opaque-bearer" },
  { workspaces: null },
])(
  "rejects changed identity, missing membership and invalid transport %#",
  async (overrides) => {
    candidate("b");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply(overrides)),
    );
    await expect(
      resumeBrowserSession(session.user.id, "unit-shop", "Refused"),
    ).rejects.toThrow("Refused");
  },
);
it("rejects a browser identity changed during validation", async () => {
  candidate("b");
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const pending = resumeBrowserSession(session.user.id, "unit-shop", "Refused");
  candidate("c");
  finish(reply());
  await expect(pending).rejects.toThrow("Refused");
});
it("requires a valid proof and surfaces server rejection", async () => {
  candidate("invalid");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(
    resumeBrowserSession(session.user.id, "unit-shop", "Refused"),
  ).rejects.toThrow("Refused");
  expect(fetcher).not.toHaveBeenCalled();
  candidate("b");
  fetcher.mockResolvedValue(
    new Response(
      JSON.stringify({
        errors: [{ detail: "Session or integration key expired or invalid" }],
      }),
      { status: 401 },
    ),
  );
  await expect(
    resumeBrowserSession(session.user.id, "unit-shop", "Refused"),
  ).rejects.toThrow();
});
