/** Explicit unit-history permission shares the existing customer order detail component. */
import { useEffect, useState, useRef } from "react";
import { downloadFile } from "../../shared/api/download";
import { shopScope } from "../../shared/api/shop-scope";
import { shopApi } from "../../shared/api/shop-api";
import { useLocale } from "../../shared/i18n/i18n";
import { useB2BQuoteText } from "../../shared/i18n/b2b-quotes-i18n";
import type { CustomerOrder } from "./account-types";
import AccountOrderDetail from "./AccountOrderDetail";
export default function CompanyOrders({
  unit,
  busy,
  run,
}: {
  unit: string;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const { locale } = useLocale();
  const generation = useRef(0);
  const [error, setError] = useState("");
  const t = useB2BQuoteText(),
    [orders, setOrders] = useState<CustomerOrder[]>([]),
    [id, setId] = useState("");
  const read = async (id?: string) =>
    (
      await shopApi<{ elements: CustomerOrder[] }>(
        "/store-api/b2b/unit.orders",
        { unitId: unit, id },
      )
    ).elements;
  useEffect(() => {
    const current = ++generation.current;
    setId("");
    setOrders([]);
    setError("");
    void read()
      .then((v) => {
        if (current === generation.current) setOrders(v);
      })
      .catch((e) => {
        if (current === generation.current) setError((e as Error).message);
      });
    return () => {
      generation.current++;
    };
  }, [unit]);
  return (
    <section>
      <h3>{t("orders")}</h3>
      {error && <p role="alert">{error}</p>}
      {id ? (
        <AccountOrderDetail
          key={unit + id}
          id={id}
          loadOrder={async () => {
            return (await read(id))[0];
          }}
          onBack={() => setId("")}
          onOrder={setId}
          downloads={[]}
          download={(path) =>
            run(() =>
              downloadFile(path, {
                "x-tenant": shopScope(),
                "x-customer-token":
                  localStorage.getItem(`rac-customer:${shopScope()}`) ?? "",
              }),
            )
          }
          busy={busy}
          run={run}
          onError={(e) =>
            void run(async () => {
              throw e;
            })
          }
        />
      ) : (
        orders.map((o) => (
          <button key={o.id} onClick={() => setId(o.id)}>
            {o.orderNumber} ·{" "}
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency: o.cart.price.currency ?? "EUR",
            }).format(o.cart.price.totalPrice)}{" "}
            · {t("details")}
          </button>
        ))
      )}
    </section>
  );
}
