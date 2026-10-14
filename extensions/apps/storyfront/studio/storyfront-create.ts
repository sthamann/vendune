/** Only public workspace/channel identifiers cross to the configured Experience entry; never tokens or customer data. */
export function storyfrontCreateURL(
  workspace: string,
  channel: string,
  locale: string,
  hostname = location.hostname,
) {
  const configured = import.meta.env.VITE_EXPERIENCE_ORIGIN as
    string | undefined;
  const origin =
    configured ??
    (hostname === "veyndo.ai" || hostname.endsWith(".veyndo.ai")
      ? "https://experience.veyndo.ai"
      : undefined);
  if (!origin) return undefined;
  try {
    const root = new URL(origin);
    if (
      root.username ||
      root.password ||
      root.pathname !== "/" ||
      root.search ||
      root.hash ||
      (root.protocol !== "https:" &&
        !(
          root.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(root.hostname)
        ))
    )
      return undefined;
    const url = new URL("/connect", root);
    url.searchParams.set("shop", workspace);
    url.searchParams.set("channel", channel);
    url.searchParams.set("locale", locale);
    return url.href;
  } catch {
    return undefined;
  }
}
