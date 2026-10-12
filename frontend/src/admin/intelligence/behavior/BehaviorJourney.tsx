/** Authorized journey timeline links to native product, customer and order views, through permission-bound native CRM references. */
import {
  useBehaviorText,
  type BehaviorWord,
} from "../../../shared/i18n/behavior-i18n";
import { useLocale } from "../../../shared/i18n/i18n";
import type { Journey } from "./types";
export default function BehaviorJourney({
  journey,
  onClose,
  onProduct,
  onEntity,
}: {
  journey: Journey;
  onClose: () => void;
  onProduct: (id: string) => void;
  onEntity?: (kind: "customers" | "orders", id: string) => void;
}) {
  const k = useBehaviorText(),
    { date } = useLocale();
  return (
    <section
      className="behavior-card behavior-journey"
      aria-label={k("inspect")}
    >
      <header>
        <h2>{k("inspect")}</h2>
        <button className="studio-secondary" onClick={onClose}>
          {k("close")}
        </button>
      </header>
      <ol>
        {journey.events.map((e) => (
          <li key={e.id}>
            <time>{date(e.time)}</time>
            <strong>{k(e.kind as BehaviorWord)}</strong>
            <div>
              {e.productId && (
                <button
                  className="behavior-link"
                  onClick={() => onProduct(e.productId!)}
                >
                  {e.productId}
                </button>
              )}
              {e.customerRef && journey.canOpenCustomers && onEntity && (
                <button
                  className="behavior-link"
                  onClick={() => onEntity("customers", e.customerRef!)}
                >
                  {k("openCustomer")}
                </button>
              )}
              {e.orderId && journey.canOpenOrders && onEntity && (
                <button
                  className="behavior-link"
                  onClick={() => onEntity("orders", e.orderId!)}
                >
                  {k("order")} · {e.orderNumber ?? e.orderId}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {journey.truncated && <p>{k("limited")}</p>}
    </section>
  );
}
