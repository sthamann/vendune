/** shop api: Typed commerce contracts, merchant/store transports and binary download helper. */
import { requestJson } from "./request-json";
import { shopScope } from "./shop-scope";
import { responseError } from "../i18n/errors-i18n";
import { getLocale } from "../i18n/i18n";
import {
  customerSessionHeaders,
  acceptCustomerSession,
  forgetCustomerSession,
  customerSessionGeneration,
} from "./customer-session";
import { browserCredential } from "./browser-session";
export type CurrencyDefinition = {
  code: string;
  scale: number;
  rate: string;
  strategy: "automatic" | "fixed";
};
export type CurrencyConfig = {
  baseCurrency: string;
  pricingCurrency?: string;
  defaultCurrency: string;
  enabled: string[];
  definitions: CurrencyDefinition[];
  autoRefresh: boolean;
  rateSource: "manual" | "ecb";
  rateDate: string | null;
};
export type CurrencyContext = {
  code: string;
  scale: number;
  factor: string;
  baseCurrency: string;
  strategy: string;
  rateSource: string;
  rateDate: string | null;
};
export type Product = {
  id: string;
  product_number?: string;
  parent_id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency?: string;
  calculated_price?: Price;
  tax_rate: number;
  stock: number;
  revision: number;
  options: Record<string, string>;
  media: { id: string; url: string; view: string }[];
  properties: Record<string, string>;
  min_purchase: number;
  purchase_steps: number;
  max_purchase?: number;
  delivery_days: number;
  list_price?: number;
  extra?: {
    seo?: Record<string, { title: string; description: string; slug: string }>;
    specifications?: Record<string, Record<string, string>>;
    crossSelling?: string[];
    shippingFree?: boolean;
    digital?: boolean;
    compliance?: Record<string, unknown>;
    richDescription?: Record<
      string,
      import("../content/RichDescription").RichBlock[]
    >;
  };
};
export type Selection = {
  country: string;
  shippingMethodId: string;
  paymentMethodId: string;
  address?: import("../customer/customer-types").Address | null;
  billingAddress?: import("../customer/customer-types").Address | null;
  billingAddressId?: string | null;
  shippingAddressId?: string | null;
  customerEmail?: string | null;
};
export type Shipping = {
  id: string;
  name: string;
  translations?: import("../geography/geography-types").TextMap;
  description?: string;
  price: number;
  freeAbove: number | null;
  minDays: number;
  maxDays: number;
  countries: string[];
  active: boolean;
  taxType: string;
};
export type Payment = {
  provider?: string;
  providerMethod?: string;
  id: string;
  name: string;
  translations?: import("../geography/geography-types").TextMap;
  description?: string;
  countries?: string[];
  restrictedCountries?: boolean;
  active: boolean;
  businessOnly: boolean;
  mode: string;
};
export type Config = {
  currencies?: CurrencyConfig;
  legal?: import("../legal/legal-types").LegalConfig;
  customerGroups?: import("../customer/customer-types").CustomerGroup[];
  countries: string[];
  mainLocale?: string;
  locales?: string[];
  countryDefinitions?: import("../geography/geography-types").Country[];
  taxes: import("../geography/geography-types").TaxClass[];
  shipping: Shipping[];
  payments: Payment[];
};
export type Price = {
  calculatedTaxes?: { tax: number; taxRate: number; price: number }[];
  unitPrice: number;
  totalPrice: number;
  listPrice?: { price: number; percentage: number };
  referencePrice?: { price: number; reference_unit: number; unit_name: string };
};
export type Order = {
  id: string;
  orderNumber: string;
  revision: number;
  state: string;
  cart: Cart;
  payment: {
    provider: string;
    attemptId?: string;
    state: string;
    realMoneyCharged?: boolean;
    method?: Payment;
  };
  deliveries?: {
    state: string;
    trackingCode?: string;
    trackingUrl?: string;
    shippingMethod: Shipping;
    deliveryDate: { earliest: string; latest: string };
  }[];
};
export type Cart = {
  b2b?: {
    quoteId?: string;
    unitId: string;
    purchaseOrder: string;
    costCenter: string;
    budgetAvailable: boolean;
    approvalRequired: boolean;
    approval?: { id: string; state: string };
  };
  currencyContext?: CurrencyContext;
  availableCurrencies?: string[];
  legal?: { requiresDigital: boolean; strictCheckout: boolean };
  couponCodes?: string[];
  discountTotal?: number;
  discounts?: {
    id: string;
    name: Record<string, string>;
    kind: string;
    amount: number;
  }[];
  id: string;
  token: string;
  revision: number;
  status: string;
  customerGroup: string;
  customerId?: string | null;
  customerEmail?: string | null;
  checkout: Selection;
  availableCountries: string[];
  selectionNeedsConfirmation?: boolean;
  lineItems: {
    id: string;
    label: string;
    media?: Product["media"];
    quantity: number;
    minPurchase: number;
    purchaseSteps: number;
    maxPurchase?: number;
    price: Price;
    appConfigurations?: {
      app: string;
      productId: string;
      fields: Record<string, unknown>;
      feeMinor: number;
      currency?: string;
      appVersion: string;
      ruleRevision: number;
    }[];
  }[];
  shippingCosts: { totalPrice: number };
  shippingMethodOptions?: Shipping[];
  paymentMethodOptions?: Payment[];
  availableShippingMethods: Shipping[];
  availablePaymentMethods: Payment[];
  deliveries: { deliveryDate: { earliest: string; latest: string } }[];
  price: {
    currency?: string;
    currencyScale?: number;
    positionPrice: number;
    totalPrice: number;
    netPrice: number;
    tax: number;
    taxStatus: string;
  };
  order?: Order;
};
export type Review = {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  verifiedPurchase: boolean;
  demo: boolean;
  approved?: boolean;
  productId?: string;
};
export type Detail = {
  product: Product;
  familyId: string;
  variants: Product[];
  variantsPagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
  calculatedPrices: {
    quantity: number;
    price: Price;
    discountPercent: number;
  }[];
  taxStatus: string;
  country: string;
  delivery?: { method: Shipping; minDays: number; maxDays: number };
  reviews: { count: number; average: number; elements: Review[] };
};
export function getContentLocale() {
  return new URLSearchParams(location.search).get("language") ?? getLocale();
}
export async function shopApi<T = unknown>(
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
  merchant?: string,
): Promise<T> {
  const shop = shopScope();
  const channel =
    new URLSearchParams(location.search).get("channel") ?? "default";
  const customerHeaders = customerSessionHeaders(shop);
  const sessionGeneration = customerSessionGeneration(shop);
  const r = await requestJson(path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      "x-commerce-locale": getContentLocale(),
      ...(localStorage.getItem(`rac-currency:${shop}:${channel}`)
        ? {
            "x-commerce-currency": localStorage.getItem(
              `rac-currency:${shop}:${channel}`,
            )!,
          }
        : {}),
      "sw-sales-channel-id": channel,
      ...customerHeaders,
      "x-tenant": shop,
      ...(token ? { "sw-context-token": token } : {}),
      ...(merchant ||
      (new URLSearchParams(location.search).get("sandbox") === "1"
        ? browserCredential()
        : "")
        ? {
            Authorization: `Bearer ${merchant || browserCredential()}`,
          }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const v = r.value;
  const sameSession = customerSessionGeneration(shop) === sessionGeneration;
  if (
    r.ok &&
    v.customerToken &&
    sameSession &&
    [
      "/store-api/account/login",
      "/store-api/account/register",
      "/store-api/account/password",
    ].includes(path)
  )
    acceptCustomerSession(shop, v);
  if (
    shopScope() === shop &&
    r.status === 409 &&
    v.errors?.[0]?.detail?.startsWith("Currency unavailable") &&
    path === "/store-api/checkout/cart" &&
    body !== undefined &&
    method !== "PUT"
  ) {
    const key = `rac-currency:${shop}:${channel}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      return shopApi<T>(path, body, token, method, merchant);
    }
  }

  if (
    sameSession &&
    r.status === 401 &&
    path.startsWith("/store-api/") &&
    v.errors?.[0]?.detail === "Customer session expired"
  ) {
    forgetCustomerSession(shop);
    if (
      shopScope() === shop &&
      path === "/store-api/checkout/cart" &&
      body !== undefined &&
      method !== "PUT"
    )
      return shopApi<T>(path, body, token, method, merchant);
  }
  if (!r.ok)
    throw Object.assign(
      responseError(v.errors?.[0]?.detail ?? r.statusText, r.status),
      {
        customerScope: { tenant: shop, generation: sessionGeneration },
      },
    );
  return v;
}
