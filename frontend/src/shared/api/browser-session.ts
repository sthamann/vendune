/** Native browser credentials stay HttpOnly; JavaScript carries only an anti-CSRF proof and a public mode marker. */
import { customerBrowserRequest } from "./customer-session";
export const browserSessionMarker = "browser-session";
let activeProof: string | undefined;
const legacyCredentials = new Map<string, string>();
/** Reading a candidate never changes this tab's accepted identity. */
export function browserSessionCandidate() {
  if (typeof document === "undefined") return "";
  const values = document.cookie
    .split(";")
    .map((part) => part.trim().split("="));
  return (
    values.find(
      ([key]) => key === "__Host-veyndo-csrf" || key === "veyndo-csrf",
    )?.[1] ?? ""
  );
}
function csrf() {
  if (activeProof === undefined) activeProof = browserSessionCandidate();
  return activeProof;
}
export function browserCredential(legacy = "rac-user-token") {
  if (typeof sessionStorage !== "undefined") {
    const stored = sessionStorage.getItem(legacy);
    if (stored) {
      legacyCredentials.set(legacy, stored);
      sessionStorage.removeItem(legacy);
    }
  }
  if (/^[a-f0-9]{64}$/i.test(csrf())) return browserSessionMarker;
  return legacyCredentials.get(legacy) ?? "";
}
/** Only an explicitly accepted login/renewal can replace this tab's session fence. */
export function activateBrowserSession(session: {
  browserCsrf?: string;
  browserSession?: boolean;
}) {
  if (
    session.browserSession &&
    /^[a-f0-9]{64}$/i.test(session.browserCsrf ?? "")
  )
    activeProof = session.browserCsrf!;
}
export function browserSessionScope() {
  return csrf();
}
export function forgetLegacyCredentials() {
  legacyCredentials.clear();
  sessionStorage.removeItem("rac-user-token");
  sessionStorage.removeItem("rac-platform-token");
}
export function browserRequest(
  path: string,
  init: RequestInit = {},
): RequestInit {
  init = customerBrowserRequest(path, init);
  const headers = new Headers(init.headers);
  // Public storefront operations also live under /api/. An ambient merchant
  // cookie must never turn a customer/concierge/app call into a Studio request.
  if (
    !headers.get("authorization")?.startsWith("Bearer ") &&
    !path.startsWith("/api/auth/") &&
    path !== "/api/identity/session"
  )
    return init;
  if (
    !path.startsWith("/api/") &&
    path !== "/mcp" &&
    !(
      path.startsWith("/store-api/") &&
      headers.get("authorization") === `Bearer ${browserSessionMarker}`
    )
  )
    return init;
  headers.set("x-veyndo-browser-session", "1");
  if (headers.get("authorization") === `Bearer ${browserSessionMarker}`)
    headers.delete("authorization");
  const proof = csrf();
  if (proof) headers.set("x-veyndo-csrf", proof);
  return { ...init, headers, credentials: "same-origin" };
}
