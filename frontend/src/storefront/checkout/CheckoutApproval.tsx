/** Request approval only after native checkout review, then refresh that exact cart without changing its revision. */
import { useRef, useState } from "react";
import { shopApi, type Cart } from "../../shared/api/shop-api";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
export default function CheckoutApproval({
  cart,
  reviewed,
  busy,
  onCart,
  onBusy,
}: {
  cart: Cart;
  reviewed: boolean;
  busy: boolean;
  onCart: (cart: Cart) => void;
  onBusy: (busy: boolean) => void;
}) {
  const t = useB2BText(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const b2b = cart.b2b;
  const current = useRef(cart);
  current.current = cart;
  if (!b2b) return null;
  const run = async (request: boolean) => {
    if (busy || pending || !reviewed) return;
    setPending(true);
    onBusy(true);
    setError("");
    try {
      if (request)
        await shopApi(
          "/store-api/b2b/approval.request",
          { revision: cart.revision },
          cart.token,
        );
      const next = await shopApi<Cart>(
        "/store-api/checkout/cart",
        undefined,
        cart.token,
      );
      if (
        current.current.id === cart.id &&
        current.current.token === cart.token &&
        current.current.revision === cart.revision
      )
        onCart(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
      onBusy(false);
    }
  };
  return (
    <section className="checkout-b2b" aria-label={t("portal")}>
      <h3>{t("portal")}</h3>
      <p>{b2b.costCenter}</p>
      <p>
        {t("po")}: {b2b.purchaseOrder}
      </p>
      <p role="status">
        {t(b2b.budgetAvailable ? "budgetAvailable" : "budgetExceeded")}
      </p>
      {b2b.approvalRequired && (
        <>
          <p>{t("reviewApprovalHint")}</p>
          {b2b.approval && (
            <p role="status">
              {t(
                b2b.approval.state === "approved"
                  ? "approved"
                  : b2b.approval.state === "rejected"
                    ? "rejected"
                    : "pending",
              )}
            </p>
          )}
          {!b2b.approval && (
            <button
              type="button"
              className="shop-secondary"
              disabled={busy || pending || !reviewed}
              onClick={() => void run(true)}
            >
              {t("requestApproval")}
            </button>
          )}
          <button
            type="button"
            className="shop-secondary"
            disabled={busy || pending || !reviewed}
            onClick={() => void run(false)}
          >
            {t("refresh")}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
