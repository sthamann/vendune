/** Register composition: persisted sale, catalog, customer and assistant tools share native transport. */
import { useState } from "react";
import type { Channel } from "../channels/channel-model";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
import Icon from "../../shared/ui/Icon";
import { usePosText } from "./pos-i18n";
import { useRegister } from "./useRegister";
import RegisterCatalog from "./RegisterCatalog";
import RegisterCart from "./RegisterCart";
import RegisterReceipt from "./RegisterReceipt";
import RegisterAssistant from "./RegisterAssistant";
import { useRegisterViewport } from "./useRegisterViewport";
import type { POSProps as Props } from "./POSWorkspace";
export default function Register({
  channel,
  mainLocale,
  rights,
  ...props
}: Props & { channel: Channel; mainLocale: string; rights: string[] }) {
  const t = usePosText();
  const { locale } = useLocale();
  const r = useRegister(props.request, channel, props.workspace);
  const pane = useRegisterViewport();
  const [held, setHeld] = useState<
    { token: string; items: { quantity: number }[] }[] | null
  >(null);
  const [sales, setSales] = useState<
    | {
        id: string;
        number: string;
        money: { currency: { code: string; scale: number }; minor: number };
      }[]
    | null
  >(null);
  const [error, setError] = useState("");
  const [assistant, setAssistant] = useState(false);
  const [panel, setPanel] = useState("catalog");
  const list = async (op: "held" | "sales") => {
    setError("");
    try {
      const v = await r.command(op);
      if (op === "held") {
        setHeld(
          v.elements.filter(
            (v: { token: string }) => v.token !== r.cart?.token,
          ),
        );
        setSales(null);
      } else {
        setSales(v.elements);
        setHeld(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <nav className="pos-subnav">
        {rights.includes("knowledge.read") && (
          <button
            className="pos-assistant-toggle"
            onClick={() => setAssistant(!assistant)}
            aria-expanded={assistant}
          >
            <Icon name="spark" />
            {t("assistantTitle")}
          </button>
        )}
        <span>
          <Icon name="check" />
          {contentText(channel.data.name, locale, mainLocale)}
        </span>
        <button disabled={r.busy} onClick={() => void list("held")}>
          <Icon name="history" />
          {t("held")}
        </button>
        <button disabled={r.busy} onClick={() => void list("sales")}>
          <Icon name="form" />
          {t("recent")}
        </button>
      </nav>
      {assistant && (
        <RegisterAssistant
          key={r.cart?.id}
          register={r}
          onClose={() => setAssistant(false)}
        />
      )}
      {(r.error || error) && (
        <div className="pos-error" role="alert">
          <span>{r.error || error}</span>
          <button disabled={r.busy} onClick={() => void r.recover()}>
            <Icon name="refresh" />
            {t("connection")}
          </button>
        </div>
      )}
      {(held || sales) && (
        <section className="pos-history">
          <header>
            <h2>{t(held ? "held" : "recent")}</h2>
            <button
              aria-label={t("close")}
              onClick={() => {
                setHeld(null);
                setSales(null);
              }}
            >
              <Icon name="close" />
            </button>
          </header>
          {held?.map((c, i) => (
            <button
              key={c.token}
              disabled={r.busy}
              onClick={() => void r.resume(c.token).then(() => setHeld(null))}
            >
              {t("resume")} · {i + 1}
              <strong>
                {c.items.reduce((n, v) => n + v.quantity, 0)} · {t("subtotal")}
              </strong>
            </button>
          ))}
          {sales?.map((o) => (
            <button key={o.id} onClick={() => props.onOrder(o.id)}>
              {o.number}
              <strong>
                {new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency: o.money.currency.code,
                }).format(Number(o.money.minor) / 10 ** o.money.currency.scale)}
              </strong>
              <Icon name="arrow" />
            </button>
          ))}
        </section>
      )}
      {r.order ? (
        <RegisterReceipt
          register={r}
          request={props.request}
          download={props.download}
          onOrder={props.onOrder}
          message={channel.data.pos?.receiptMessage ?? {}}
          mainLocale={mainLocale}
          rights={rights}
        />
      ) : r.cart ? (
        <>
          <nav className="pos-mobile-switch" aria-label={t("title")}>
            <button
              aria-pressed={panel === "catalog"}
              onClick={() => setPanel("catalog")}
            >
              <Icon name="box" />
              {t("catalog")}
            </button>
            <button
              aria-pressed={panel === "cart"}
              onClick={() => setPanel("cart")}
            >
              <Icon name="register" />
              {t("cart")} ·{" "}
              {r.cart.lineItems.reduce((n, i) => n + i.quantity, 0)}
            </button>
          </nav>
          <div ref={pane} className="pos-register" data-panel={panel}>
            <RegisterCatalog register={r} channel={channel} />
            <RegisterCart
              register={r}
              channel={channel.id}
              mainLocale={mainLocale}
              rights={rights}
            />
          </div>
        </>
      ) : (
        <div className="pos-empty" role="status">
          <Icon name="refresh" />
          <p>{t("busy")}</p>
        </div>
      )}
    </>
  );
}
