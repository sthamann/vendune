/** Native Studio register; all reads and writes use authenticated, tenant-scoped shared commerce operations. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import type { Channel } from "../channels/channel-model";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
import Icon from "../../shared/ui/Icon";
import { usePosText } from "./pos-i18n";
import { useRegister } from "./useRegister";
import RegisterCatalog from "./RegisterCatalog";
import RegisterCart from "./RegisterCart";
import RegisterReceipt from "./RegisterReceipt";
import "./pos.css";
import "./pos-receipt.css";
import "./pos-responsive.css";
type Props = {
  request: RequestFn;
  workspace: string;
  onChannels: () => void;
  onOrder: (id: string) => void;
  download: (path: string) => Promise<void>;
};
export default function POSWorkspace(props: Props) {
  const t = usePosText();
  const { locale } = useLocale();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [main, setMain] = useState("");
  const [selected, setSelected] = useState(
    new URLSearchParams(location.search).get("posChannel") ?? "",
  );
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      props.request("/api/pos/channels"),
      props.request("/api/auth/access"),
    ])
      .then(([v, p]) => {
        if (!active) return;
        if (
          !p.permissions.includes("pos.use") ||
          !p.permissions.includes("orders.write")
        ) {
          setError(t("permission"));
          return;
        }
        const channels = v.channels.filter(
          (v: Channel) => v.data.kind === "pos",
        );
        setChannels(channels);
        setMain(v.mainLocale);
        setSelected((old) =>
          channels.some((c: Channel) => c.id === old)
            ? old
            : (channels.find((c: Channel) => c.data.active)?.id ?? ""),
        );
        setReady(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [props.request]);
  const channel = channels.find((c) => c.id === selected && c.data.active);
  return (
    <div className="studio-page pos-workspace">
      <header className="pos-heading">
        <div>
          <span className="pos-eyebrow">
            <Icon name="register" />
            {t("online")}
          </span>
          <h1>{t("title")}</h1>
          <p>{t("hint")}</p>
        </div>
        <div className="pos-toolbar">
          <label>
            {t("choose")}
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                const url = new URL(location.href);
                url.searchParams.set("posChannel", e.target.value);
                history.replaceState(null, "", url);
              }}
            >
              {channels
                .filter((c) => c.data.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {contentText(c.data.name, locale, main) || c.id}
                  </option>
                ))}
            </select>
          </label>
          <button onClick={props.onChannels}>
            <Icon name="settings" />
            {t("setup")}
          </button>
        </div>
      </header>
      {error && (
        <div className="pos-error" role="alert">
          {error}
        </div>
      )}
      {ready && !channel && (
        <section className="pos-start">
          <div className="pos-start-icon">
            <Icon name="register" size={52} />
          </div>
          <h2>{t("empty")}</h2>
          <button className="studio-primary" onClick={props.onChannels}>
            {t("setup")}
            <Icon name="arrow" />
          </button>
        </section>
      )}
      {channel && (
        <Register
          key={channel.id}
          {...props}
          channel={channel}
          mainLocale={main}
        />
      )}
    </div>
  );
}
function Register({
  channel,
  mainLocale,
  ...props
}: Props & { channel: Channel; mainLocale: string }) {
  const t = usePosText();
  const { locale } = useLocale();
  const r = useRegister(props.request, channel, props.workspace);
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
          <div className="pos-register" data-panel={panel}>
            <RegisterCatalog register={r} channel={channel} />
            <RegisterCart
              register={r}
              channel={channel.id}
              mainLocale={mainLocale}
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
