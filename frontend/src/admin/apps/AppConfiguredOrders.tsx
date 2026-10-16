/** Immutable app purchase cards reuse native order navigation and preserve source-currency and rule snapshots. */
import { useState } from "react";
import { useAppText } from "../../shared/i18n/app-i18n";
import { contentText } from "../../shared/i18n/content-language";
import type { Package } from "./app-types";
export type PurchasedConfiguration = {
  app?: string;
  fields?: Record<string, unknown>;
  text?: string;
  feeMinor: number;
  currency?: string;
  appVersion?: string;
  ruleRevision?: number;
  ruleFields?: Record<string, unknown>;
};
export type ConfiguredOrders = {
  elements: {
    orderId: string;
    orderNumber?: string;
    items: {
      referencedId: string;
      label?: string;
      quantity: number;
      configuration?: PurchasedConfiguration;
      appConfigurations?: PurchasedConfiguration[];
    }[];
  }[];
  hasMore?: boolean;
  nextCursor?: string | null;
};
export default function AppConfiguredOrders({
  result,
  app,
  mainLocale,
  onOrder,
  onPage,
  busy,
}: {
  result: ConfiguredOrders;
  app: Package;
  mainLocale: string;
  onOrder?: (id: string) => void;
  onPage?: (cursor?: string) => void;
  busy: boolean;
}) {
  const { a, locale, money } = useAppText();
  const contract = app.manifest.configuration;
  const [cursors, setCursors] = useState<string[]>([""]);
  return (
    <section className="studio-card app-card app-configured-orders">
      <h2>{a("personalizedOrders")}</h2>
      {!result.elements.length && <p>{a("emptyOrders")}</p>}
      {result.elements.map((order) => (
        <article key={order.orderId}>
          <header>
            <strong>
              {a("orderLabel")} {order.orderNumber ?? order.orderId}
            </strong>
            {onOrder && (
              <button
                type="button"
                className="studio-secondary"
                onClick={() => onOrder(order.orderId)}
              >
                {a("openOrder")}
              </button>
            )}
          </header>
          {order.items.flatMap((item) =>
            (
              item.appConfigurations?.filter((c) => c.app === app.id) ??
              (item.configuration ? [item.configuration] : [])
            ).map((config, index) => {
              const format = config.currency
                ? new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: config.currency,
                  })
                : undefined;
              const amount = format
                ? format.format(
                    config.feeMinor /
                      10 **
                        (format.resolvedOptions().maximumFractionDigits ?? 2),
                  )
                : money(config.feeMinor / 100);
              return (
                <section key={`${item.referencedId}:${index}`}>
                  <h3>
                    {item.quantity} × {item.label ?? item.referencedId}
                  </h3>
                  <dl>
                    {Object.entries(
                      config.fields ?? { text: config.text ?? "" },
                    ).map(([key, value]) => {
                      const field = contract?.inputs?.fields.find(
                        (f) => f.name === key,
                      );
                      const nameField = app.manifest.entities
                        .find((entity) => entity.name === contract?.entity)
                        ?.fields.find((f) => f.translatable)?.name;
                      const name =
                        key === contract?.inputs?.recordField && nameField
                          ? config.ruleFields?.[nameField]
                          : undefined;
                      const label = field
                        ? contentText(field.label, locale, mainLocale)
                        : key;
                      return (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>
                            {name && typeof name === "object"
                              ? contentText(
                                  name as Record<string, string>,
                                  locale,
                                  mainLocale,
                                )
                              : String(value)}
                          </dd>
                        </div>
                      );
                    })}
                    <div>
                      <dt>{a("surcharge")}</dt>
                      <dd>{amount}</dd>
                    </div>
                  </dl>
                  <small>
                    {a("version")} {config.appVersion} · {a("revision")}{" "}
                    {config.ruleRevision}
                  </small>
                </section>
              );
            }),
          )}
        </article>
      ))}
      {onPage && (result.hasMore || cursors.length > 1) && (
        <nav className="configuration-pagination">
          <button
            type="button"
            className="studio-secondary"
            disabled={busy || cursors.length < 2}
            onClick={() => {
              const next = cursors.slice(0, -1);
              setCursors(next);
              onPage(next.at(-1));
            }}
          >
            {a("previousOrders")}
          </button>
          <button
            type="button"
            className="studio-secondary"
            disabled={busy || !result.hasMore || !result.nextCursor}
            onClick={() => {
              const next = result.nextCursor!;
              setCursors([...cursors, next]);
              onPage(next);
            }}
          >
            {a("moreOrders")}
          </button>
        </nav>
      )}
    </section>
  );
}
