/** Customer transport shares the native ledger; each tenant and browser tab has its own session fence. */
const marker = "browser-customer-session";
const proofs = new Map<string, string>();
const generations = new Map<string, number>();
export function customerSessionGeneration(tenant: string) {
  return generations.get(tenant) ?? 0;
}
const transitional = new Map<string, string>();
const key = (tenant: string) => `rac-customer:${tenant}`;
function csrf(tenant: string) {
  if (!proofs.has(tenant)) {
    const values = document.cookie.split(";").map((p) => p.trim().split("="));
    proofs.set(
      tenant,
      values.find(
        ([k]) =>
          k === `__Host-veyndo-customer-csrf-${tenant}` ||
          k === `veyndo-customer-csrf-${tenant}`,
      )?.[1] ?? "",
    );
  }
  return proofs.get(tenant)!;
}
export function customerCredential(tenant: string) {
  const legacy = localStorage.getItem(key(tenant));
  if (legacy) {
    if (transitional.get(tenant) !== legacy)
      generations.set(tenant, customerSessionGeneration(tenant) + 1);
    transitional.set(tenant, legacy);
    localStorage.removeItem(key(tenant));
  }
  return /^[a-f0-9]{64}$/i.test(csrf(tenant))
    ? marker
    : (transitional.get(tenant) ?? "");
}
export function customerSessionHeaders(tenant: string): Record<string, string> {
  const token = customerCredential(tenant);
  return token ? { "x-customer-token": token } : {};
}
export function acceptCustomerSession(
  tenant: string,
  session: {
    customerToken?: string;
    customerBrowserSession?: boolean;
    customerBrowserCsrf?: string;
  },
) {
  generations.set(tenant, customerSessionGeneration(tenant) + 1);
  if (
    session.customerBrowserSession &&
    /^[a-f0-9]{64}$/i.test(session.customerBrowserCsrf ?? "")
  ) {
    proofs.set(tenant, session.customerBrowserCsrf!);
    transitional.delete(tenant);
  } else if (session.customerToken && session.customerToken !== marker) {
    // Compatibility during a rolling release, memory only; never persist new bearer tokens.
    transitional.set(tenant, session.customerToken);
  }
  if (session.customerToken) localStorage.removeItem(key(tenant));
}
export function forgetCustomerSession(tenant: string) {
  generations.set(tenant, customerSessionGeneration(tenant) + 1);
  proofs.set(tenant, "");
  transitional.delete(tenant);
  localStorage.removeItem(key(tenant));
}
export function customerBrowserRequest(path: string, init: RequestInit) {
  if (!path.startsWith("/store-api/")) return init;
  const headers = new Headers(init.headers);
  const tenant = headers.get("x-tenant");
  if (!tenant || !/^[a-z0-9-]{2,48}$/.test(tenant)) return init;
  const proof = csrf(tenant),
    token = headers.get("x-customer-token");
  if (
    !token &&
    !proof &&
    ![
      "/store-api/account/login",
      "/store-api/account/register",
      "/store-api/account/logout",
    ].includes(path)
  )
    return init;
  headers.set("x-veyndo-customer-session", "1");
  if (token === marker) headers.delete("x-customer-token");
  if (proof) headers.set("x-veyndo-customer-csrf", proof);
  return { ...init, headers, credentials: "same-origin" as const };
}
