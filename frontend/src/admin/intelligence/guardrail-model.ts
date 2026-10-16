/** Native policy shape and currency conversion only; admission remains in the Rust commerce owner. */
import type { Config } from "../../shared/api/shop-api";
export type Corridor = {
  productId: string;
  currency: string;
  minimumMinor: number;
  maximumMinor: number;
  minimumMarginBps: number;
  unitCostNetMinor?: number | null;
  maximumDiscountBps?: number | null;
  priceLocked?: boolean;
  requireAvailable?: boolean;
};
export type Policy = {
  corridors: Corridor[];
  autonomy: { enabled: boolean; maxChangeBps: number; productsPerDay: number };
};
export type Settings = Config & { aiPolicy?: Policy };
export const defaultPolicy: Policy = {
  corridors: [],
  autonomy: { enabled: false, maxChangeBps: 500, productsPerDay: 20 },
};
export function validPolicy(policy: Policy, settings: Settings) {
  const a = policy.autonomy;
  return (
    Number.isInteger(a.maxChangeBps) &&
    a.maxChangeBps >= 0 &&
    a.maxChangeBps <= 500 &&
    Number.isInteger(a.productsPerDay) &&
    a.productsPerDay >= 1 &&
    a.productsPerDay <= 100 &&
    policy.corridors.length <= 1000 &&
    new Set(policy.corridors.map((r) => r.productId)).size ===
      policy.corridors.length &&
    policy.corridors.every(
      (r) =>
        settings.currencies?.definitions.some((c) => c.code === r.currency) &&
        [r.minimumMinor, r.maximumMinor].every(
          (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12,
        ) &&
        r.minimumMinor <= r.maximumMinor &&
        Number.isInteger(r.minimumMarginBps) &&
        r.minimumMarginBps >= 0 &&
        r.minimumMarginBps < 10000 &&
        (r.unitCostNetMinor == null ||
          (Number.isSafeInteger(r.unitCostNetMinor) &&
            r.unitCostNetMinor >= 0)) &&
        (!r.minimumMarginBps || r.unitCostNetMinor != null) &&
        (r.maximumDiscountBps == null ||
          (Number.isInteger(r.maximumDiscountBps) &&
            r.maximumDiscountBps >= 0 &&
            r.maximumDiscountBps <= 10000)),
    )
  );
}
