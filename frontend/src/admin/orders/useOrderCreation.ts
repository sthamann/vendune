/** Draft controller loads admitted choices, fences async reads and keeps review state separate from the editable input. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import type {
  Cart,
  Product,
  Selection,
  Shipping,
  Payment,
} from "../../shared/api/shop-api";
import type { Address } from "../../shared/customer/customer-types";
import { emptyAddress } from "../../shared/customer/customer-types";

import type { Customer } from "../../shared/customer/CustomerPicker";

import { inheritedText } from "../../shared/geography/geography-types";
import { useAdminCreationText } from "../../shared/i18n/admin-creation-i18n";
import { useShopText } from "../../shared/i18n/shop-i18n";

type Context = {
  options: {
    countries: string[];
    locales: string[];
    mainLocale: string;
    shipping: Shipping[];
    payments: Payment[];
  };
  currencies: {
    availableCurrencies: { code: string }[];
    defaultCurrency: string;
  };
  policy: { policyVersion: string };
  channels: { id: string; name: Record<string, string> }[];
  customerGroups: any[];
  mainLocale: string;
};
type Review = {
  cart: Cart & { price: Cart["price"] & { totalMinor: string } };
  policy: { policyVersion: string };
};
export default function useOrderCreation(request: RequestFn) {
  const { n, locale } = useAdminCreationText(),
    { s } = useShopText();
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([
      { id: "default", name: "default" },
    ]),
    [channel, setChannel] = useState("default"),
    [language, setLanguage] = useState<string>("");
  const [context, setContext] = useState<Context>(),
    [currency, setCurrency] = useState(""),
    [customer, setCustomer] = useState<Customer>();
  const [items, setItems] = useState<
      { id: string; name: string; quantity: number }[]
    >([]),
    [selection, setSelection] = useState<Selection>({
      country: "DE",
      shippingMethodId: "pickup",
      paymentMethodId: "demo-card",
    });
  const [billing, setBilling] = useState<Address>(emptyAddress()),
    [shipping, setShipping] = useState<Address>(emptyAddress()),
    [same, setSame] = useState(true),
    [codes, setCodes] = useState("");
  const [review, setReview] = useState<Review>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false),
    [creatingCustomer, setCreatingCustomer] = useState(false);
  const [groups, setGroups] = useState<any[]>([]),
    [mainLocale, setMainLocale] = useState("en-GB");
  const [authorization, setAuthorization] = useState(false),
    [terms, setTerms] = useState(false),
    [digital, setDigital] = useState(false),
    [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let active = true;
    setContext(undefined);
    setReview(undefined);
    request("/api/merchant/order-drafts/context", {
      channelId: channel,
      ...(language ? { locale: language } : {}),
    })
      .then((v) => {
        if (!active) return;
        setContext(v);
        setChannels(
          v.channels.map((c: any) => ({
            id: c.id,
            name:
              c.name?.[locale] ??
              c.name?.[v.mainLocale] ??
              Object.values(c.name ?? {})[0] ??
              c.id,
          })),
        );
        setGroups(v.customerGroups);
        setMainLocale(v.mainLocale);
        if (!language) setLanguage(v.options.mainLocale);
        setCurrency(v.currencies.defaultCurrency);
        setSelection((prev) => ({
          ...prev,
          country: v.options.countries.includes(prev.country)
            ? prev.country
            : v.options.countries[0],
          shippingMethodId: v.options.shipping[0]?.id ?? "",
          paymentMethodId:
            v.options.payments.find((p: any) =>
              ["manual", "simulated"].includes(p.mode),
            )?.id ?? "",
        }));
        setError("");
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [channel, language, request]);
  const customerEpoch = useRef(0);
  useEffect(
    () => () => {
      customerEpoch.current += 1;
    },
    [request],
  );
  const pickCustomer = async (c?: Customer) => {
    setReview(undefined);
    setCustomer(c);
    setBilling(emptyAddress(context?.options.countries[0]));
    setShipping(emptyAddress(context?.options.countries[0]));
    const epoch = ++customerEpoch.current;
    if (!c) return;
    try {
      const detail = await request(
        `/api/merchant/customers/${encodeURIComponent(c.email)}`,
      );
      if (epoch !== customerEpoch.current) return;
      const list = detail.addresses;
      const bill = list.elements.find(
        (a: any) => a.id === list.defaultBillingAddressId,
      )?.address;
      const ship = list.elements.find(
        (a: any) => a.id === list.defaultShippingAddressId,
      )?.address;
      setBilling(bill ?? emptyAddress(context?.options.countries[0]));
      setShipping(ship ?? bill ?? emptyAddress(context?.options.countries[0]));
      setSame(
        !ship || list.defaultShippingAddressId === list.defaultBillingAddressId,
      );
    } catch (e) {
      if (epoch === customerEpoch.current) setError((e as Error).message);
    }
  };
  const addProduct = (p: Product) =>
    setItems((old) =>
      old.some((i) => i.id === p.id)
        ? old.map((i) =>
            i.id === p.id
              ? { ...i, quantity: i.quantity + (p.purchase_steps ?? 1) }
              : i,
          )
        : [...old, { id: p.id, name: p.name, quantity: p.min_purchase ?? 1 }],
    );
  const countries = context?.options.countries ?? [];
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: review?.cart.price.currency ?? currency ?? "EUR",
    }).format(amount);
  const groupName = (id: string) =>
    inheritedText(
      groups.find((g) => g.id === id)?.translations ?? {},
      locale,
      mainLocale,
      "name",
    ) || id;
  const dirty = items.length > 0 || !!customer || !!billing.street;
  return {
    n,
    locale,
    s,
    channels,
    channel,
    setChannel,
    language,
    setLanguage,
    context,
    currency,
    setCurrency,
    customer,
    items,
    setItems,
    selection,
    setSelection,
    billing,
    setBilling,
    shipping,
    setShipping,
    same,
    setSame,
    codes,
    setCodes,
    review,
    setReview,
    busy,
    setBusy,
    error,
    setError,
    discard,
    setDiscard,
    creatingCustomer,
    setCreatingCustomer,
    groups,
    groupName,
    authorization,
    setAuthorization,
    terms,
    setTerms,
    digital,
    setDigital,
    requestKey,
    setRequestKey,
    pickCustomer,
    addProduct,
    countries,
    money,
    dirty,
  };
}
export type OrderCreation = ReturnType<typeof useOrderCreation>;
