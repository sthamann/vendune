/** Native Studio register; all reads and writes use authenticated, tenant-scoped shared commerce operations. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import type { Channel } from "../channels/channel-model";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
import Icon from "../../shared/ui/Icon";
import { usePosText } from "./pos-i18n";
import Register from "./Register";
import { useCashierFocus } from "./useCashierFocus";
import "./pos.css";
import "./pos-receipt.css";
import "./pos-responsive.css";
import "./cashier.css";
export type POSProps = {
  request: RequestFn;
  workspace: string;
  onChannels: () => void;
  onOrder: (id: string) => void;
  download: (path: string) => Promise<void>;
};
export default function POSWorkspace(props: POSProps) {
  const t = usePosText();
  const { locale } = useLocale();
  const focus = useCashierFocus();
  const [rights, setRights] = useState<string[]>([]);
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
        setRights(p.permissions);
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
    <div className="studio-page pos-workspace" data-focus={focus.active}>
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
          <button
            className="pos-focus-toggle"
            onClick={focus.toggle}
            aria-pressed={focus.active}
          >
            <Icon name={focus.active ? "arrow" : "frame"} />
            {t(focus.active ? "exitFocus" : "focus")}
          </button>
          {focus.active && (
            <button aria-label={t("fullscreen")} onClick={focus.fullscreen}>
              <Icon name="frame" />
            </button>
          )}
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
          rights={rights}
        />
      )}
    </div>
  );
}
