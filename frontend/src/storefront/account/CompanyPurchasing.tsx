/** Customer-company context, approvals and order lists use the same native cart and current employee grants. */
import CompanyLists, { type OrderList } from "./CompanyLists";
import CompanyOrders from "./CompanyOrders";
import CompanyQuotes from "./CompanyQuotes";
import { useEffect, useState, useRef } from "react";
import { shopApi, type Cart } from "../../shared/api/shop-api";
import { shopScope } from "../../shared/api/shop-scope";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import type { CompanyContext } from "../../shared/b2b/types";
import "../../shared/b2b/b2b.css";
type Approval = {
  id: string;
  state: "pending" | "approved" | "rejected" | "consumed";
  buyerId: string;
  revision: number;
  data: { quote: Cart };
};
export default function CompanyPurchasing({
  cart,
  onCart,
  customerId,
  busy,
  run,
}: {
  cart?: Cart;
  onCart: (c: Cart) => void;
  customerId: string;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const t = useB2BText(),
    { locale } = useLocale();
  const generation = useRef(0);
  const [contexts, setContexts] = useState<CompanyContext[]>([]),
    [unit, setUnit] = useState(""),
    [po, setPO] = useState(""),
    [approvals, setApprovals] = useState<Approval[]>([]),
    [lists, setLists] = useState<OrderList[]>([]),
    [skus, setSkus] = useState("");
  const [locales, setLocales] = useState<string[]>([]);
  const [main, setMain] = useState(""),
    [error, setError] = useState("");
  const command = <T,>(op: string, v: unknown = {}) =>
    shopApi<T>("/store-api/b2b/" + op, v, cart?.token);
  const reload = async (id: string) => {
    const current = ++generation.current;
    const [a, l] = await Promise.all([
      command<{ elements: Approval[] }>("approvals", { unitId: id }),
      contexts.find((u) => u.id === id)?.member.permissions.includes("lists")
        ? command<{ elements: OrderList[] }>("lists", { unitId: id })
        : Promise.resolve({ elements: [] }),
    ]);
    if (current === generation.current) {
      setApprovals(a.elements);
      setLists(l.elements);
    }
  };
  useEffect(() => {
    void (async () => {
      const v = await command<{
        elements: CompanyContext[];
        mainLocale: string;
        locales: string[];
      }>("contexts");
      setContexts(v.elements);
      setMain(v.mainLocale);
      setLocales(v.locales);
      setUnit(
        (old) =>
          [old, cart?.b2b?.unitId].find((id) =>
            v.elements.some((u) => u.id === id),
          ) ??
          v.elements[0]?.id ??
          "",
      );
    })().catch((e) => setError((e as Error).message));
  }, []);
  const context = contexts.find((c) => c.id === unit);
  useEffect(() => {
    setPO(cart?.b2b?.unitId === unit ? (cart.b2b.purchaseOrder ?? "") : "");
  }, [unit, cart?.b2b?.unitId, cart?.b2b?.purchaseOrder]);
  useEffect(() => {
    setApprovals([]);
    setLists([]);
    setError("");
    if (!unit) return;
    void reload(unit).catch((e) => setError((e as Error).message));
    return () => {
      generation.current++;
    };
  }, [unit]);
  const total = (c: Cart) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: c.price.currency ?? "EUR",
    }).format(c.price.totalPrice);
  return (
    <div className="b2b-account">
      {error && <p role="alert">{error}</p>}
      {!contexts.length ? (
        <p>{t("emptyPortal")}</p>
      ) : (
        <>
          <label>
            {t("unit")}
            <select
              value={unit}
              disabled={busy}
              onChange={(e) => setUnit(e.target.value)}
            >
              {contexts.map((u) => (
                <option key={u.id} value={u.id}>
                  {contentText(u.company.name, locale, main)} ·{" "}
                  {contentText(u.data.name, locale, main)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("po")}
            <input
              value={po}
              maxLength={100}
              onChange={(e) => setPO(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !context?.member.permissions.includes("buy")}
            onClick={() =>
              void run(async () => {
                const c =
                  cart?.status === "open"
                    ? cart
                    : await shopApi<Cart>("/store-api/checkout/cart", {});
                const next = await shopApi<Cart>(
                  "/store-api/b2b/select",
                  { unitId: unit, revision: c.revision, purchaseOrder: po },
                  c.token,
                );
                localStorage.setItem(
                  `rac-currency:${shopScope()}:${new URLSearchParams(location.search).get("channel") ?? "default"}`,
                  next.price.currency!,
                );
                onCart(next);
              })
            }
          >
            {t("select")}
          </button>
          {cart?.b2b?.unitId === unit && (
            <article>
              <strong>
                {cart.b2b.costCenter} · {total(cart)}
              </strong>
              <span>
                {t(
                  cart.b2b.budgetAvailable
                    ? "budgetAvailable"
                    : "budgetExceeded",
                )}
              </span>
              {cart.b2b.approvalRequired && (
                <button
                  disabled={busy || !cart.lineItems.length}
                  onClick={() =>
                    void run(async () => {
                      await command("approval.request", {
                        revision: cart.revision,
                      });
                      onCart(
                        await shopApi<Cart>(
                          "/store-api/checkout/cart",
                          undefined,
                          cart.token,
                        ),
                      );
                      await reload(unit);
                    })
                  }
                >
                  {t("requestApproval")}
                </button>
              )}
              {context?.member.permissions.includes("buy") && (
                <>
                  <h3>{t("quickOrder")}</h3>
                  <p>{t("skuHint")}</p>
                  <textarea
                    rows={4}
                    value={skus}
                    onChange={(e) => setSkus(e.target.value)}
                  />
                  <button
                    disabled={busy || !skus.trim()}
                    onClick={() =>
                      void run(async () => {
                        const lines = skus
                          .split("\n")
                          .filter((s) => s.trim())
                          .map((s) => {
                            const [sku, quantity] = s
                              .split(",")
                              .map((v) => v.trim());
                            return { sku, quantity: Number(quantity) };
                          });
                        onCart(
                          await command<Cart>("quick-order", {
                            revision: cart.revision,
                            lines,
                          }),
                        );
                      })
                    }
                  >
                    {t("apply")}
                  </button>
                </>
              )}
            </article>
          )}
          <nav>
            <button
              disabled={busy}
              onClick={() => void run(() => reload(unit))}
            >
              {t("refresh")}
            </button>
          </nav>
          {approvals.map((v) => (
            <article key={v.id}>
              <div className="b2b-approval">
                <strong>{total(v.data.quote)}</strong>
                <span>{t(v.state)}</span>
              </div>
              <ul>
                {v.data.quote.lineItems.map((i) => (
                  <li key={i.id}>
                    {i.quantity} × {i.label}
                  </li>
                ))}
              </ul>
              {v.state === "pending" &&
                v.buyerId !== customerId &&
                context?.member.permissions.includes("approve") && (
                  <nav>
                    {(["approved", "rejected"] as const).map((state) => (
                      <button
                        key={state}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await command("approval.decide", {
                              id: v.id,
                              revision: v.revision,
                              state,
                            });
                            await reload(unit);
                          })
                        }
                      >
                        {t(state === "approved" ? "approve" : "reject")}
                      </button>
                    ))}
                  </nav>
                )}
            </article>
          ))}
          {context?.member.permissions.includes("lists") && (
            <CompanyLists
              lists={lists}
              cart={cart}
              unit={unit}
              customerId={customerId}
              busy={busy}
              run={run}
              command={command}
              reload={() => reload(unit)}
              onCart={onCart}
              mainLocale={main}
              locales={locales}
            />
          )}
          {context?.member.permissions.includes("quotes") && (
            <CompanyQuotes
              unit={unit}
              cart={cart}
              onCart={onCart}
              busy={busy}
              run={run}
            />
          )}
          {context?.member.permissions.includes("companyOrders") && (
            <CompanyOrders unit={unit} busy={busy} run={run} />
          )}
          <AppSurfaceSlot
            location="account.b2b"
            context={{ unitId: unit, customerId }}
          />
        </>
      )}
    </div>
  );
}
