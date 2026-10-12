/** Receipt creation and PDF download reuse merchant documents and immutable order revision/idempotency. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import { useLocale } from "../../shared/i18n/i18n";
import { usePosText } from "./pos-i18n";
import type { useRegister } from "./useRegister";
import Icon from "../../shared/ui/Icon";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import { contentText } from "../../shared/i18n/content-language";
export default function RegisterReceipt({
  register: r,
  request,
  download,
  onOrder,
  message,
  mainLocale,
}: {
  register: ReturnType<typeof useRegister>;
  request: RequestFn;
  download: (path: string) => Promise<void>;
  onOrder: (id: string) => void;
  message: Record<string, string>;
  mainLocale: string;
}) {
  const t = usePosText();
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; number: string }>();
  const o = r.order!;
  useEffect(() => {
    if (
      !o.payment.attemptId ||
      ["paid", "captured", "refunded", "cancelled", "expired"].includes(
        o.payment.state,
      )
    )
      return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let rounds = 0;
    const poll = async () => {
      try {
        await r.refreshPayment();
      } catch (e) {
        if (active) setError((e as Error).message);
      }
      if (active && ++rounds < 30) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [o.id, o.payment.state]);
  const paid = ["paid", "captured"].includes(o.payment.state);
  const make = async () => {
    setBusy(true);
    setError("");
    try {
      const old = await request(`/api/merchant/orders/${o.id}/receipts`);
      const invoice = old.elements.find(
        (r: { kind: string }) => r.kind === "invoice",
      );
      setReceipt(
        invoice ??
          (await request(`/api/merchant/orders/${o.id}/receipts`, {
            revision: o.revision,
            kind: "invoice",
            locale: locale.slice(0, 2),
            requestKey: `pos-receipt-${o.id}`,
          })),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const pdf = async () => {
    setBusy(true);
    setError("");
    try {
      await download(`/api/merchant/receipts/${receipt!.id}/pdf`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pos-receipt">
      <div className="pos-receipt-mark">
        <Icon name="check" size={38} />
      </div>
      <small>{o.orderNumber}</small>
      <h2>{t("done")}</h2>
      <p>{t(paid ? "paid" : "pending")}</p>
      <strong className="pos-receipt-total">
        {new Intl.NumberFormat(locale, {
          style: "currency",
          currency: o.cart.price.currency,
        }).format(o.cart.price.totalPrice)}
      </strong>
      {o.pos?.cash && (
        <p>
          {t("change")} ·{" "}
          {new Intl.NumberFormat(locale, {
            style: "currency",
            currency: o.cart.price.currency,
          }).format(
            Number(o.pos.cash.changeMinor) / 10 ** o.cart.price.currencyScale,
          )}
        </p>
      )}
      {o.payment.approvalUrl && (
        <a
          className="pos-pay"
          href={o.payment.approvalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("paymentContinue")}
        </a>
      )}
      {o.payment.attemptId && !paid && (
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void r
              .refreshPayment(true)
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <Icon name="refresh" />
          {t("paymentRefresh")}
        </button>
      )}
      <p>
        {contentText(
          o.pos?.receiptMessage ?? message,
          locale,
          o.pos?.mainLocale ?? mainLocale,
        )}
      </p>
      <div className="pos-receipt-actions">
        <button disabled={busy} onClick={() => void make()}>
          <Icon name="form" />
          {t("receipt")}
        </button>
        {receipt && (
          <button disabled={busy} onClick={() => void pdf()}>
            {receipt.number} · {t("print")}
          </button>
        )}
        <button onClick={() => onOrder(o.id)}>{t("order")}</button>
        <button
          className="pos-pay"
          disabled={r.busy}
          onClick={() => void r.next()}
        >
          {t("next")}
          <Icon name="arrow" />
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <AppSurfaceSlot
        location="admin.pos.receipt"
        context={{ orderId: o.id }}
      />
    </section>
  );
}
