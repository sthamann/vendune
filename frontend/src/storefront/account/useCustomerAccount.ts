/** Tenant-scoped account loading and mutation lifecycle; expired sessions clear private data and reopen sign-in. */
import {
  customerCredential,
  customerSessionHeaders,
  forgetCustomerSession,
  customerSessionGeneration,
} from "../../shared/api/customer-session";
import { useCallback, useEffect, useRef, useState } from "react";
import { shopApi, type Cart } from "../../shared/api/shop-api";
import { shopScope } from "../../shared/api/shop-scope";
import { downloadFile } from "../../shared/api/download";
import { useAccountText } from "../../shared/i18n/account-i18n";
import type {
  AccountProfile,
  AccountOptions,
  CustomerOrder,
  CustomerDownload,
  CustomerOrderPage,
} from "./account-types";
export function useCustomerAccount(
  cart: Cart | undefined,
  onCart: (cart: Cart) => void,
) {
  const { a } = useAccountText();
  const scope = shopScope();
  const key = `rac-customer:${scope}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [signed, setSigned] = useState(!!customerCredential(shopScope()));
  const [profile, setProfile] = useState<AccountProfile>();
  const [options, setOptions] = useState<AccountOptions>();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>();
  const [downloads, setDownloads] = useState<CustomerDownload[]>([]);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [feedback, setFeedback] = useState("");
  const inflight = useRef(false),
    generation = useRef(0);
  const clear = useCallback(() => {
    if (currentScope.current !== scope) return;
    generation.current++;
    forgetCustomerSession(scope);
    setSigned(false);
    setProfile(undefined);
    setOrders([]);
    setNextCursor(undefined);
    setDownloads([]);
    setOptions(undefined);
    setFeedback("");
  }, [key]);
  const failure = (
    e: unknown,
    expectedScope = scope,
    expectedSession = customerSessionGeneration(scope),
  ) => {
    const context = (
      e as { customerScope?: { tenant: string; generation: number } }
    ).customerScope;
    expectedScope = context?.tenant ?? expectedScope;
    expectedSession = context?.generation ?? expectedSession;
    if (currentScope.current !== expectedScope) return;
    const now = customerSessionGeneration(expectedScope);
    // The transport may have just cleared this expired session. It cannot clear
    // an explicitly renewed session or another shop through this UI consumer.
    if (
      now !== expectedSession &&
      !(now === expectedSession + 1 && !customerCredential(expectedScope))
    )
      return;
    const detail = e as { status?: number; diagnostic?: string };
    if (
      detail.status === 401 &&
      detail.diagnostic !== "Invalid credentials" &&
      signed
    ) {
      clear();
      setError(a("sessionExpired"));
    } else setError((e as Error).message);
  };
  const expiredMessage = a("sessionExpired");
  const request = useCallback(
    async (path: string, body?: unknown, method?: string) => {
      const session = customerSessionGeneration(scope);
      try {
        const value = await shopApi<any>(path, body, undefined, method);
        if (
          currentScope.current !== scope ||
          customerSessionGeneration(scope) !== session
        )
          throw new Error(expiredMessage);
        return value;
      } catch (e) {
        failure(e, scope, session);
        throw e;
      }
    },
    [clear, expiredMessage, scope],
  );
  const load = useCallback(async () => {
    const current = ++generation.current;
    const session = customerSessionGeneration(scope);
    setLoading(true);
    try {
      const [p, o, d, list] = await Promise.all([
        shopApi<AccountProfile>("/store-api/account/profile"),
        shopApi<AccountOptions>(
          "/store-api/checkout/options",
          undefined,
          cart?.token,
        ),
        shopApi<{ elements: CustomerDownload[] }>(
          "/store-api/account/downloads",
        ),
        shopApi<CustomerOrderPage>("/store-api/account/orders"),
      ]);
      if (
        current !== generation.current ||
        currentScope.current !== scope ||
        customerSessionGeneration(scope) !== session
      )
        return;
      setProfile(p);
      setOptions(o);
      setDownloads(d.elements);
      setOrders(list.elements);
      setNextCursor(list.nextCursor);
    } catch (error) {
      if (current === generation.current) failure(error, scope, session);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [cart?.token, scope]);
  useEffect(() => {
    if (signed) void load().catch(failure);
    return () => {
      generation.current++;
    };
  }, [signed, load]);
  const run = async (fn: () => Promise<void>, message = "") => {
    if (inflight.current) return;
    inflight.current = true;
    const session = customerSessionGeneration(scope);
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await fn();
      setFeedback(message);
    } catch (e) {
      failure(e, scope, session);
    } finally {
      inflight.current = false;
      setBusy(false);
      setLoading(false);
    }
  };
  const moreOrders = () =>
    run(async () => {
      if (!nextCursor) return;
      const current = generation.current;
      const session = customerSessionGeneration(scope);
      const page = await shopApi<CustomerOrderPage>(
        `/store-api/account/orders?after=${encodeURIComponent(nextCursor)}`,
      );
      if (
        current !== generation.current ||
        currentScope.current !== scope ||
        customerSessionGeneration(scope) !== session
      )
        return;
      setOrders((previous) => {
        const ids = new Set(previous.map((o) => o.id));
        return [...previous, ...page.elements.filter((o) => !ids.has(o.id))];
      });
      setNextCursor(page.nextCursor);
    });
  const download = (path: string) =>
    run(() =>
      downloadFile(path, {
        "x-tenant": shopScope(),
        ...customerSessionHeaders(shopScope()),
      }),
    );
  const logout = () =>
    run(async () => {
      await shopApi("/store-api/account/logout", {}, cart?.token);
      clear();
      onCart(await shopApi<Cart>("/store-api/checkout/cart", {}));
    });
  const renderedSession = customerSessionGeneration(scope);
  return {
    key,
    signed,
    setSigned,
    profile,
    setProfile: (value: AccountProfile) => {
      if (
        currentScope.current === scope &&
        customerSessionGeneration(scope) === renderedSession
      )
        setProfile(value);
    },
    options,
    orders,
    nextCursor,
    moreOrders,
    downloads,
    loading,
    busy,
    error,
    feedback,
    failure,
    request,
    load,
    run,
    download,
    logout,
  };
}
