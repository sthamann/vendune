/** Self-service entry retains the current tenant and an eligible native storefront channel; no installation on a read. */
import { useEffect, useState } from "react";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Channel } from "../../../../frontend/src/admin/channels/channel-model";
import { useStoryfrontText } from "./storyfront-i18n";
import { storyfrontCreateURL } from "./storyfront-create";
export default function StoryfrontCreate({
  request,
  workspace,
  rights,
}: {
  request: RequestFn;
  workspace: string;
  rights: string[];
}) {
  const t = useStoryfrontText(),
    { locale } = useLocale();
  const [channels, setChannels] = useState<Channel[]>([]),
    [channel, setChannel] = useState(""),
    [error, setError] = useState("");
  const allowed = ["apps.manage", "channels.manage", "settings.write"].every(
    (p) => rights.includes(p),
  );
  useEffect(() => {
    let active = true;
    setChannels([]);
    setChannel("");
    setError("");
    if (!allowed) return;
    void request("/api/automation")
      .then((v) => {
        if (active) {
          const eligible = v.channels.filter(
            (c: Channel) =>
              c.data.kind === "storefront" &&
              c.data.active &&
              c.data.visibility !== "private",
          );
          setChannels(eligible);
          setChannel(eligible[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (active) setError(t("failed"));
      });
    return () => {
      active = false;
    };
  }, [request, workspace, allowed, locale]);
  const url = storyfrontCreateURL(workspace, channel, locale);
  return (
    <section className="studio-card storyfront-create">
      <div className="storyfront-create-icon">
        <Icon name="spark" size={30} />
      </div>
      <div>
        <h2>{t("create")}</h2>
        <p>{t("createHint")}</p>
        {!allowed ? (
          <p>{t("createRights")}</p>
        ) : !url ? (
          <p>{t("createUnavailable")}</p>
        ) : (
          <>
            <label>
              {t("channel")}
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contentText(c.data.name, locale, locale) || c.id}
                  </option>
                ))}
              </select>
            </label>
            {channel && (
              <a className="studio-primary" href={url}>
                {t("create")} <Icon name="arrow" size={18} />
              </a>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
