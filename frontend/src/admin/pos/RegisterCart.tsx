/** Large quantity controls and shared app surface; every edit carries the current native cart revision. */
import type { useRegister } from "./useRegister";
import { usePosText } from "./pos-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import Icon from "../../shared/ui/Icon";
import RegisterCustomer from "./RegisterCustomer";
import RegisterDiscount from "./RegisterDiscount";
import RegisterAdjustments from "./RegisterAdjustments";
import RegisterCheckout from "./RegisterCheckout";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
export default function RegisterCart({
  register: r,
  channel,
  mainLocale,
  rights,
}: {
  register: ReturnType<typeof useRegister>;
  channel: string;
  mainLocale: string;
  rights: string[];
}) {
  const t = usePosText();
  const { locale } = useLocale();
  return (
    <aside className="pos-cart">
      <header>
        <div>
          <small>{t("cart")}</small>
          <h2>
            {r.cart?.lineItems.reduce((n, i) => n + i.quantity, 0) ?? 0} ·{" "}
            {t("subtotal")}
          </h2>
        </div>
        <button
          className="pos-hold"
          disabled={r.busy || !r.cart?.lineItems.length}
          onClick={() => void r.hold()}
        >
          <Icon name="history" />
          {t("hold")}
        </button>
      </header>
      <div className="pos-cart-tools">
        {rights.includes("customers.read") &&
          rights.includes("customers.pii") && (
            <RegisterCustomer key={`customer:${r.cart!.id}`} register={r} />
          )}
        <div className="pos-cart-lines" aria-live="polite">
          {!r.cart?.lineItems.length ? (
            <div className="pos-empty">
              <Icon name="box" size={42} />
              <p>{t("nothing")}</p>
            </div>
          ) : (
            r.cart.lineItems.map((i) => (
              <article key={i.id}>
                <div>
                  <strong>{i.label}</strong>
                  <small>
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: r.cart!.price.currency,
                    }).format(i.price.totalPrice)}
                  </small>
                </div>
                <div className="pos-quantity">
                  <button
                    disabled={r.busy}
                    aria-label={`${t("remove")}: ${i.label}`}
                    onClick={() => void r.quantity(i.referencedId ?? i.id, -1)}
                  >
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    disabled={r.busy}
                    aria-label={`${t("add")}: ${i.label}`}
                    onClick={() => void r.quantity(i.referencedId ?? i.id, 1)}
                  >
                    +
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <AppSurfaceSlot
          location="admin.pos.cart"
          context={{ salesChannelId: channel }}
        />
        {rights.includes("payments.manage") && (
          <RegisterDiscount key={`discount:${r.cart!.id}`} register={r} />
        )}
        <RegisterAdjustments register={r} mainLocale={mainLocale} />
      </div>
      <RegisterCheckout key={`checkout:${r.cart!.id}`} register={r} />
    </aside>
  );
}
