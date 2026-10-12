/** Opt-in behavior signals and stable product ordering; no authoritative prices are changed. */
import { channelPreview } from "./ChannelPreview";
import { usePurpose } from "../../shared/legal/consent-store";
import { useEffect, useState, useRef } from "react";
import { shopApi, type Cart, type Product } from "../../shared/api/shop-api";
export function usePersonalization(
  products: Product[],
  cart: Cart | undefined,
  id: string,
  _shopTenant: string,
) {
  const scope = `${_shopTenant}:${cart?.id ?? ""}`;
  type Profile = {
    scope: string;
    ranked: string[];
    personalized: boolean;
    viewed: Record<string, number>;
  };
  const empty = (): Profile => ({
    scope,
    ranked: [],
    personalized: false,
    viewed: {},
  });
  const [profile, setProfile] = useState<Profile>(empty);
  const current = useRef(scope);
  current.current = scope;
  const adaptation = usePurpose("personalization") && !channelPreview();
  const activeProfile =
    profile.scope === scope && adaptation ? profile : empty();
  const { ranked, personalized, viewed } = activeProfile;
  const setRanked = (ranked: string[]) =>
    setProfile((p) => ({ ...(p.scope === scope ? p : empty()), ranked }));
  const setPersonalized = (personalized: boolean) =>
    setProfile((p) => ({ ...(p.scope === scope ? p : empty()), personalized }));
  const setViewed = (
    next:
      | Record<string, number>
      | ((v: Record<string, number>) => Record<string, number>),
  ) =>
    setProfile((p) => {
      const previous = p.scope === scope ? p : empty();
      return {
        ...previous,
        viewed: typeof next === "function" ? next(previous.viewed) : next,
      };
    });
  useEffect(() => {
    if (!adaptation || !cart || !id) return;
    let active = true;
    const expectedScope = scope;
    shopApi<{ rankedProductIds: string[]; adapted: boolean }>(
      "/store-api/personalization/events",
      {
        productId: id,
        eventId: crypto.randomUUID().replaceAll("-", ""),
        kind: "view",
      },
      cart.token,
    )
      .then((v) => {
        if (active && current.current === expectedScope) {
          setRanked(v.rankedProductIds);
          setPersonalized(v.adapted);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, adaptation, scope]);
  useEffect(() => {
    if (!adaptation) setProfile(empty());
  }, [adaptation, scope]);
  const affinity = Object.entries(viewed).sort((a, b) => b[1] - a[1])[0];
  const adapted =
    adaptation && (personalized || (!!affinity && affinity[1] >= 3));
  const rank = (id: string) => {
    const index = ranked.indexOf(id);
    return index < 0 ? ranked.length : index;
  };
  const list = [...products].sort((a, b) =>
    adaptation && ranked.length
      ? rank(a.id) - rank(b.id)
      : adapted && affinity
        ? Number(b.category === affinity[0]) -
          Number(a.category === affinity[0])
        : 0,
  );
  return {
    ranked,
    setRanked,
    personalized,
    setPersonalized,
    adaptation,
    viewed,
    setViewed,
    affinity,
    adapted,
    rank,
    list,
  };
}
