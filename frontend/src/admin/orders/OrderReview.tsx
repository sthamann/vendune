/** Reviewed native quote and explicit customer-authorisation acknowledgements precede the idempotent order command. */
import type { RequestFn } from "../../shared/api/types";
import type { OrderCreation } from "./useOrderCreation";
export default function OrderReview({
  state,
  request,
  onCreated,
}: {
  state: OrderCreation;
  request: RequestFn;
  onCreated: (id: string) => void;
}) {
  const {
    n,
    locale,
    channels,
    channel,
    language,
    customer,
    review,
    setReview,
    busy,
    setBusy,
    setError,
    authorization,
    setAuthorization,
    terms,
    setTerms,
    digital,
    setDigital,
    requestKey,
    money,
  } = state;

  if (!review) return null;
  const addresses = [
    review.cart.checkout?.billingAddress,
    review.cart.checkout?.address,
  ];
  return (
    <div className="admin-create-section">
      <h3>{n("reviewed")}</h3>
      <p>
        {customer?.email} ·{" "}
        {new Intl.DisplayNames(locale, { type: "language" }).of(language) ||
          language}{" "}
        · {channels.find((c) => c.id === channel)?.name ?? channel}
      </p>
      <div className="admin-review-addresses">
        {addresses.map(
          (a, index) =>
            a && (
              <article key={index}>
                <h3>{n(index === 0 ? "billing" : "shipping")}</h3>
                <address>
                  {a.name}
                  <br />
                  {a.street}
                  <br />
                  {a.postalCode} {a.city}
                  <br />
                  {a.country &&
                    new Intl.DisplayNames(locale, { type: "region" }).of(
                      a.country,
                    )}
                </address>
              </article>
            ),
        )}
      </div>
      <div className="admin-order-review">
        {review.cart.lineItems.map((item) => (
          <div className="admin-order-line" key={item.id}>
            <strong>{item.label}</strong>
            <span>{item.quantity}</span>
            <strong>{money(item.price.totalPrice)}</strong>
          </div>
        ))}
        <dl>
          <dt>{n("items")}</dt>
          <dd>{money(review.cart.price.positionPrice)}</dd>
          <dt>{n("delivery")}</dt>
          <dd>{money(review.cart.shippingCosts.totalPrice)}</dd>
          <dt>{n("tax")}</dt>
          <dd>{money(review.cart.price.tax)}</dd>
          <dt className="admin-order-total">{n("total")}</dt>
          <dd className="admin-order-total">
            {money(review.cart.price.totalPrice)}
          </dd>
        </dl>
        <p>{n("paymentHint")}</p>
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={authorization}
          disabled={busy}
          onChange={(e) => setAuthorization(e.target.checked)}
        />
        {n("authorization")}
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={terms}
          disabled={busy}
          onChange={(e) => setTerms(e.target.checked)}
        />
        {n("terms")}
      </label>
      {review.cart.legal?.requiresDigital && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={digital}
            disabled={busy}
            onChange={(e) => setDigital(e.target.checked)}
          />
          {n("digital")}
        </label>
      )}
      <div className="settings-save-bar">
        <button
          type="button"
          className="studio-secondary"
          disabled={busy}
          onClick={() => setReview(undefined)}
        >
          {n("edit")}
        </button>
        <button
          type="button"
          className="studio-primary"
          disabled={
            busy ||
            !authorization ||
            !terms ||
            (review.cart.legal?.requiresDigital && !digital)
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const order = await request(
                "/api/merchant/order-drafts/complete",
                {
                  channelId: channel,
                  locale: language,
                  cartToken: review.cart.token,
                  revision: review.cart.revision,
                  totalMinor: review.cart.price.totalMinor,
                  approve: true,
                  customerAcknowledgement: authorization,
                  policyVersion: review.policy.policyVersion,
                  terms,
                  digitalImmediate: digital,
                  requestKey,
                },
              );
              onCreated(order.id);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {n(busy ? "busy" : "newOrder")}
        </button>
      </div>
    </div>
  );
}
