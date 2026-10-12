/** Register commands share authenticated Studio transport and persist only the cart capability locally. */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePosText } from "./pos-i18n";
import type { RequestFn } from "../../shared/api/types";
import type { Channel } from "../channels/channel-model";
import type { PosCart, PosOrder, PosProduct } from "./pos-model";
export function useRegister(
  request: RequestFn,
  channel: Channel,
  workspace: string,
) {
  const t = usePosText();
  const [cart, setCart] = useState<PosCart>();
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<PosOrder>();
  const [options, setOptions] = useState<{
    payments: { id: string; name: string; mode: string }[];
  }>();
  const [policy, setPolicy] = useState<{ policyVersion: string }>();
  const fence = useRef(false);
  const catalogSequence = useRef(0);
  const current = useRef(cart);
  current.current = cart;
  const storage = `vendune.pos.${workspace}.${channel.id}`;
  const command = useCallback(
    (operation: string, body: Record<string, unknown> = {}) =>
      request(`/api/pos/${encodeURIComponent(channel.id)}/${operation}`, body),
    [request, channel.id],
  );
  const run = async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    if (fence.current) return;
    fence.current = true;
    setBusy(true);
    setError("");
    try {
      return await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      fence.current = false;
      setBusy(false);
    }
  };
  const catalog = useCallback(
    async (query = "", barcode?: string, cursor?: string) => {
      const seq = ++catalogSequence.current;
      try {
        const v = await command("catalog", {
          query,
          ...(current.current ? { cartToken: current.current.token } : {}),
          ...(barcode ? { barcode } : {}),
          ...(cursor ? { after: cursor } : {}),
        });
        if (seq !== catalogSequence.current) return;
        setProducts((old) => (cursor ? [...old, ...v.elements] : v.elements));
        setAfter(v.nextCursor);
        return v.elements as PosProduct[];
      } catch (e) {
        if (seq === catalogSequence.current) setError((e as Error).message);
      }
    },
    [command],
  );
  const next = async () => {
    const v = await command("create");
    setCart(v.cart);
    current.current = v.cart;
    setOrder(undefined);
    setOptions(v.options);
    setPolicy(v.policy);
    sessionStorage.setItem(storage, v.cart.token);
    await catalog();
    return v.cart as PosCart;
  };
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const v = await command("context");
        if (!active) return;
        setOptions(v.options);
        setPolicy(v.policy);
        const token = sessionStorage.getItem(storage);
        const restored = token
          ? await command("cart", { cartToken: token }).catch(() => null)
          : null;
        if (!active) return;
        const selected =
          restored?.status === "open"
            ? restored
            : (await command("create")).cart;
        if (!active) return;
        setCart(selected);
        current.current = selected;
        sessionStorage.setItem(storage, selected.token);
        await catalog();
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
      catalogSequence.current++;
    };
  }, [command, storage, catalog]);
  const replace = async (items: { id: string; quantity: number }[]) => {
    const c = current.current;
    if (!c) return;
    const v = await command("replace", {
      cartToken: c.token,
      revision: c.revision,
      items,
    });
    setCart(v);
    current.current = v;
  };
  const items = () =>
    current.current?.lineItems.map((i) => ({
      id: i.referencedId ?? i.id,
      quantity: i.quantity,
    })) ?? [];
  const add = (p: PosProduct) =>
    run(async () => {
      const rows = items();
      const i = rows.find((i) => i.id === p.id);
      if (i) i.quantity += p.purchase_steps ?? 1;
      else
        rows.push({ id: p.id, quantity: p.min_purchase ?? p.minPurchase ?? 1 });
      await replace(rows);
    });
  const quantity = (id: string, delta: number) =>
    run(() =>
      replace(
        items()
          .map((i) =>
            i.id === id
              ? {
                  ...i,
                  quantity:
                    delta < 0 &&
                    i.quantity <=
                      (current.current?.lineItems.find((l) => l.id === id)
                        ?.minPurchase ?? 1)
                      ? 0
                      : i.quantity +
                        delta *
                          (current.current?.lineItems.find((l) => l.id === id)
                            ?.purchaseSteps ?? 1),
                }
              : i,
          )
          .filter((i) => i.quantity > 0),
      ),
    );
  const select = (checkout: PosCart["checkout"]) =>
    run(async () => {
      const c = current.current!;
      const v = await command("select", {
        cartToken: c.token,
        revision: c.revision,
        checkout,
      });
      setCart(v);
      current.current = v;
    });
  const adjust = (
    operation: "currency" | "coupons",
    value: Record<string, unknown>,
  ) =>
    run(async () => {
      const c = current.current!;
      const v = await command(operation, {
        cartToken: c.token,
        revision: c.revision,
        ...value,
      });
      setCart(v);
      current.current = v;
      if (operation === "currency") await catalog();
    });
  const complete = (
    tenderMinor: string | undefined,
    terms: boolean,
    digital: boolean,
  ) =>
    run(async () => {
      const c = current.current!;
      if (policy && (c.legal?.strictCheckout || c.legal?.requiresDigital))
        await command("accept", {
          cartToken: c.token,
          policyVersion: policy.policyVersion,
          terms,
          digitalImmediate: digital,
        });
      let v: PosOrder;
      try {
        v = await command("complete", {
          cartToken: c.token,
          revision: c.revision,
          totalMinor: c.price.totalMinor,
          requestKey: `pos-${c.id}`,
          ...(tenderMinor ? { tenderMinor } : {}),
        });
      } catch (e) {
        const status = await command("cart", { cartToken: c.token }).catch(
          () => null,
        );
        if (!status?.order) throw e;
        v = status.order;
      }
      setOrder(v);
      sessionStorage.removeItem(storage);
    });
  const recover = () =>
    run(async () => {
      const v = await command("cart", { cartToken: current.current?.token });
      setCart(v);
      current.current = v;
      if (v.order) setOrder(v.order);
    });
  const resume = (token: string) =>
    run(async () => {
      const v = await command("cart", { cartToken: token });
      if (v.status === "completed") throw new Error(t("closed"));
      setCart(v);
      current.current = v;
      sessionStorage.setItem(storage, token);
      setOrder(undefined);
    });
  return {
    cart,
    products,
    after,
    error,
    busy,
    order,
    options,
    policy,
    command,
    catalog,
    add,
    quantity,
    select,
    adjust,
    complete,
    recover,
    refreshPayment: async (reconcile = false) => {
      const v = await command(reconcile ? "reconcile" : "payment", {
        cartToken: current.current?.token,
        ...(reconcile ? { requestKey: crypto.randomUUID() } : {}),
      });
      setOrder({ ...v.order, payment: { ...v.order.payment, ...v.payment } });
      return v.payment;
    },
    resume,
    next: () => run(next),
    hold: () => run(next),
  };
}
