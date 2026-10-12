/** Small POS view models and exact decimal input conversion; server quotes own all calculations. */
export type PosCart = {
  id: string;
  token: string;
  revision: number;
  status?: string;
  order?: PosOrder;
  availableCurrencies?: string[];
  couponCodes?: string[];
  discounts?: { name: Record<string, string>; amount: number }[];
  lineItems: {
    id: string;
    referencedId?: string;
    label: string;
    quantity: number;
    minPurchase?: number;
    purchaseSteps?: number;
    price: { totalPrice: number };
  }[];
  price: {
    totalPrice: number;
    totalMinor: string;
    currencyScale: number;
    currency: string;
    calculatedTaxes?: { tax: number }[];
  };
  checkout: {
    country: string;
    shippingMethodId: string;
    paymentMethodId: string;
    customerEmail?: string;
    billingAddress?: unknown;
  };
  legal?: { strictCheckout: boolean; requiresDigital: boolean };
};
export type PosOrder = {
  id: string;
  orderNumber: string;
  revision: number;
  cart: PosCart;
  payment: { state: string; attemptId?: string; approvalUrl?: string };
  pos?: {
    cash?: { tenderMinor: string; changeMinor: string };
    receiptMessage?: Record<string, string>;
    mainLocale?: string;
  };
};
export type PosProduct = {
  id: string;
  name: string;
  productNumber?: string;
  price: { unitPrice?: number; totalPrice?: number } | number;
  media?: { url: string }[];
  stock: number;
  minPurchase?: number;
  min_purchase?: number;
  purchase_steps?: number;
  options?: Record<string, string>;
  parentId?: string;
  children?: unknown[];
};
export function inputMinor(value: string, scale: number): bigint | null {
  if (!Number.isInteger(scale) || scale < 0 || scale > 6) return null;
  const parts = value
    .trim()
    .replace(",", ".")
    .match(/^(\d{1,12})(?:\.(\d*))?$/);
  if (!parts || (parts[2]?.length ?? 0) > scale) return null;
  return (
    BigInt(parts[1]) * 10n ** BigInt(scale) +
    BigInt((parts[2] ?? "").padEnd(scale, "0") || "0")
  );
}
export function decimalMinor(value: string, scale: number) {
  const n = BigInt(value);
  const p = 10n ** BigInt(scale);
  return scale
    ? `${n / p}.${(n % p).toString().padStart(scale, "0")}`
    : n.toString();
}
