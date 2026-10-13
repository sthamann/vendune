/** Minimal first-party observations reuse the server consent receipt; no fingerprint or persistent analytics identifier. */
import { useEffect, useRef } from "react";
import { shopApi, type Cart } from "../../shared/api/shop-api";
import { useConsent, usePurpose } from "../../shared/legal/consent-store";
import { channelPreview } from "./ChannelPreview";
export default function BehaviorAnalytics({
  shop,
  channel,
  cart,
  id,
  bag,
  query,
  route,
}: {
  shop: string;
  channel: string;
  cart?: Cart;
  id: string | null;
  bag: boolean;
  query: string;
  route: string;
}) {
  const allowed = usePurpose("analytics");
  const consent = useConsent();
  const previous = useRef<
    | {
        scope: string;
        route: string;
        quantities: Record<string, number>;
        bag: boolean;
      }
    | undefined
  >(undefined);
  const token = cart?.token;
  const scope = `${shop}:${channel}:${token}`;
  const enabled =
    allowed &&
    consent.behaviorAnalyticsEnabled !== false &&
    !!token &&
    cart?.status === "open" &&
    !channelPreview() &&
    new URLSearchParams(location.search).get("sandbox") !== "1";
  useEffect(() => {
    if (!enabled) {
      previous.current = undefined;
      return;
    }
    const surface = bag
      ? "checkout"
      : id
        ? "product"
        : route.startsWith("#legal")
          ? "content"
          : "collection";
    let referrerHost: string | undefined;
    try {
      const u = new URL(document.referrer);
      if (u.host !== location.host) referrerHost = u.hostname;
    } catch {
      /* No referrer is a valid direct visit. */
    }
    const send = (kind: string, productId?: string) =>
      void shopApi(
        "/store-api/behavior/events",
        {
          eventId: crypto.randomUUID().replaceAll("-", ""),
          kind,
          productId,
          surface,
          viewport:
            innerWidth < 768
              ? "mobile"
              : innerWidth < 1200
                ? "tablet"
                : "desktop",
          referrerHost,
        },
        token,
      ).catch(() => {
        /* Optional observation failure must never interrupt commerce. */
      });
    const before =
      previous.current?.scope === scope ? previous.current : undefined;
    const page = `${route}:${id ?? ""}`;
    if (!before || before.route !== page) {
      send("page_view");
      if (id) send("product_view", id);
    }
    const quantities = Object.fromEntries(
      (cart?.lineItems ?? []).map((i) => [i.id, i.quantity]),
    );
    if (before)
      for (const [productId, q] of Object.entries(quantities))
        if (q > (before.quantities[productId] ?? 0))
          send("cart_add", productId);
    if (bag && !before?.bag && cart?.lineItems.length) send("checkout_start");
    previous.current = { scope, route: page, quantities, bag };
  }, [enabled, scope, token, cart?.revision, id, bag, route]);
  useEffect(() => {
    if (!enabled || !query.trim()) return;
    const timer = setTimeout(
      () =>
        void shopApi(
          "/store-api/behavior/events",
          {
            eventId: crypto.randomUUID().replaceAll("-", ""),
            kind: "search",
            surface: "collection",
            viewport:
              innerWidth < 768
                ? "mobile"
                : innerWidth < 1200
                  ? "tablet"
                  : "desktop",
          },
          token,
        ).catch(() => {}),
      750,
    );
    return () => clearTimeout(timer);
  }, [enabled, scope, query, token]);
  useEffect(() => {
    if (!enabled) return;
    const receive = (e: Event) => {
      const productId = (e as CustomEvent<{ productId: string }>).detail
        ?.productId;
      if (productId === id)
        void shopApi(
          "/store-api/behavior/events",
          {
            eventId: crypto.randomUUID().replaceAll("-", ""),
            kind: "product_question",
            productId,
            surface: "product",
            viewport:
              innerWidth < 768
                ? "mobile"
                : innerWidth < 1200
                  ? "tablet"
                  : "desktop",
          },
          token,
        ).catch(() => {});
    };
    window.addEventListener("veyndo:product-question", receive);
    return () => window.removeEventListener("veyndo:product-question", receive);
  }, [enabled, scope, id, token]);
  return null;
}
