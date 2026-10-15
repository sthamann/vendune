/** Actual shared transports retain per-tab identity fences, isolate customer scopes and never persist new bearers. */
import { beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  for (const part of document.cookie.split(";"))
    document.cookie = `${part.split("=")[0].trim()}=; Max-Age=0; Path=/`;
});
it("upgrades a legacy merchant credential and uses only its frozen anti-CSRF proof afterwards", async () => {
  const b = await import("../../src/shared/api/browser-session");
  sessionStorage.setItem("rac-user-token", "legacy-synthetic-bearer");
  expect(b.browserCredential()).toBe("legacy-synthetic-bearer");
  b.activateBrowserSession({
    browserSession: true,
    browserCsrf: "a".repeat(64),
  });
  b.forgetLegacyCredentials();
  expect(b.browserCredential()).toBe("browser-session");
  expect(sessionStorage.getItem("rac-user-token")).toBeNull();
  const init = b.browserRequest("/api/merchant/products", {
    headers: { Authorization: "Bearer browser-session" },
  });
  const h = new Headers(init.headers);
  expect(h.has("authorization")).toBe(false);
  expect(h.get("x-veyndo-csrf")).toBe("a".repeat(64));
  expect(init.credentials).toBe("same-origin");
});
it("cannot silently adopt an account logged into another tab", async () => {
  const b = await import("../../src/shared/api/browser-session");
  document.cookie = `veyndo-csrf=${"a".repeat(64)}; Path=/`;
  expect(b.browserCredential()).toBe("browser-session");
  document.cookie = `veyndo-csrf=${"b".repeat(64)}; Path=/`;
  expect(
    new Headers(b.browserRequest("/api/auth/session").headers).get(
      "x-veyndo-csrf",
    ),
  ).toBe("a".repeat(64));
  b.activateBrowserSession({
    browserSession: true,
    browserCsrf: "b".repeat(64),
  });
  expect(b.browserSessionScope()).toBe("b".repeat(64));
});
it("does not coalesce reads from two explicitly accepted browser identities", async () => {
  const b = await import("../../src/shared/api/browser-session");
  const { requestJson } = await import("../../src/shared/api/request-json");
  const replies: ((r: Response) => void)[] = [];
  const fetcher = vi.fn(
    () => new Promise<Response>((resolve) => replies.push(resolve)),
  );
  vi.stubGlobal("fetch", fetcher);
  b.activateBrowserSession({
    browserSession: true,
    browserCsrf: "a".repeat(64),
  });
  const first = requestJson("/api/auth/session", {
    headers: { Authorization: "Bearer browser-session" },
  });
  b.activateBrowserSession({
    browserSession: true,
    browserCsrf: "b".repeat(64),
  });
  const second = requestJson("/api/auth/session", {
    headers: { Authorization: "Bearer browser-session" },
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
  replies[0](new Response(JSON.stringify({ identity: "one" })));
  replies[1](new Response(JSON.stringify({ identity: "two" })));
  expect((await first).value.identity).toBe("one");
  expect((await second).value.identity).toBe("two");
});
it("keeps customer cookies tenant-bound and prevents cross-tab customer adoption", async () => {
  const c = await import("../../src/shared/api/customer-session");
  const b = await import("../../src/shared/api/browser-session");
  c.acceptCustomerSession("one", {
    customerToken: "browser-customer-session",
    customerBrowserSession: true,
    customerBrowserCsrf: "a".repeat(64),
  });
  c.acceptCustomerSession("two", {
    customerToken: "browser-customer-session",
    customerBrowserSession: true,
    customerBrowserCsrf: "b".repeat(64),
  });
  document.cookie = `veyndo-customer-csrf-one=${"c".repeat(64)}; Path=/`;
  for (const [tenant, proof] of [
    ["one", "a"],
    ["two", "b"],
  ]) {
    const init = b.browserRequest("/store-api/account/orders", {
      headers: { "x-tenant": tenant, ...c.customerSessionHeaders(tenant) },
    });
    const h = new Headers(init.headers);
    expect(h.has("x-customer-token")).toBe(false);
    expect(h.get("x-veyndo-customer-csrf")).toBe(proof.repeat(64));
    expect(h.has("x-veyndo-browser-session")).toBe(false);
  }
  expect(localStorage.getItem("rac-customer:one")).toBeNull();
  c.forgetCustomerSession("one");
  expect(c.customerSessionHeaders("one")).toEqual({});
  expect(c.customerSessionHeaders("two")).toEqual({
    "x-customer-token": "browser-customer-session",
  });
});
it("uses the same cookie boundary for platform administration and authenticated previews", async () => {
  const b = await import("../../src/shared/api/browser-session");
  const { platformRequest } = await import("../../src/platform/platform-api");
  b.activateBrowserSession({
    browserSession: true,
    browserCsrf: "d".repeat(64),
  });
  const fetcher = vi.fn(
    async (_path: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ user: { id: "operator" } })),
  );
  vi.stubGlobal("fetch", fetcher);
  await platformRequest("browser-session", "/api/platform/session");
  expect(
    new Headers(fetcher.mock.calls[0][1]?.headers).get("x-veyndo-csrf"),
  ).toBe("d".repeat(64));
  const mcp = b.browserRequest("/mcp", {
    headers: { Authorization: "Bearer browser-session" },
  });
  expect(new Headers(mcp.headers).get("x-veyndo-browser-session")).toBe("1");
  expect(new Headers(mcp.headers).has("authorization")).toBe(false);
  const preview = b.browserRequest("/store-api/product", {
    headers: { Authorization: "Bearer browser-session" },
  });
  expect(new Headers(preview.headers).get("x-veyndo-browser-session")).toBe(
    "1",
  );
});
it("never sends ambient merchant authority to public storefront operations sharing the API namespace", async () => {
  const b = await import("../../src/shared/api/browser-session");
  b.activateBrowserSession({
    browserSession: true,
    browserCsrf: "a".repeat(64),
  });
  for (const path of [
    "/api/experience",
    "/api/concierge",
    "/api/apps/example/actions/read",
  ]) {
    const init = b.browserRequest(path, { headers: { "x-tenant": "one" } });
    const h = new Headers(init.headers);
    expect(h.has("x-veyndo-browser-session")).toBe(false);
    expect(h.has("x-veyndo-csrf")).toBe(false);
  }
});
it.each([200, 401])(
  "ignores a delayed customer response after an accepted account and shop change (%s)",
  async (status) => {
    const c = await import("../../src/shared/api/customer-session");
    const { shopApi } = await import("../../src/shared/api/shop-api");
    history.replaceState(null, "", "/?shop=one");
    c.acceptCustomerSession("one", {
      customerToken: "browser-customer-session",
      customerBrowserSession: true,
      customerBrowserCsrf: "a".repeat(64),
    });
    let finish!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const pending = shopApi("/store-api/account/profile");
    const failure =
      status === 401 ? expect(pending).rejects.toThrow() : undefined;
    c.acceptCustomerSession("one", {
      customerToken: "browser-customer-session",
      customerBrowserSession: true,
      customerBrowserCsrf: "b".repeat(64),
    });
    history.replaceState(null, "", "/?shop=two");
    c.acceptCustomerSession("two", {
      customerToken: "browser-customer-session",
      customerBrowserSession: true,
      customerBrowserCsrf: "c".repeat(64),
    });
    finish(
      new Response(
        JSON.stringify(
          status === 200
            ? {
                customerToken: "browser-customer-session",
                customerBrowserSession: true,
                customerBrowserCsrf: "a".repeat(64),
              }
            : { errors: [{ detail: "Customer session expired" }] },
        ),
        { status },
      ),
    );
    if (failure) await failure;
    else await pending;
    for (const [tenant, proof] of [
      ["one", "b"],
      ["two", "c"],
    ]) {
      const init = c.customerBrowserRequest("/store-api/account/orders", {
        headers: { "x-tenant": tenant, ...c.customerSessionHeaders(tenant) },
      });
      expect(new Headers(init.headers).get("x-veyndo-customer-csrf")).toBe(
        proof.repeat(64),
      );
    }
  },
);
