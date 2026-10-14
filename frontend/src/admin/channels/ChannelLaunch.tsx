/** Successful native channel creation ends in a clear next action; no provider is connected implicitly. */
import Icon from "../../shared/ui/Icon";
import type { Channel } from "./channel-model";
import { useChannelText } from "./channel-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
export default function ChannelLaunch({
  channel,
  mainLocale,
  onEdit,
  onMarketplace,
}: {
  channel: Channel;
  mainLocale: string;
  onEdit: () => void;
  onMarketplace?: () => void;
}) {
  const t = useChannelText(),
    { locale } = useLocale();
  return (
    <section className="studio-card channel-launch">
      <span className="channel-avatar">
        <Icon name="check" size={30} />
      </span>
      <p role="status">{t("saved")}</p>
      <h2>{contentText(channel.data.name, locale, mainLocale)}</h2>
      <p>{t("createdHint")}</p>
      <div className="workbench-row">
        {channel.data.kind === "marketplace" && onMarketplace && (
          <button className="studio-primary" onClick={onMarketplace}>
            {t("marketplaceManage")} <Icon name="arrow" size={18} />
          </button>
        )}
        <button className="studio-secondary" onClick={onEdit}>
          {t("edit")}
        </button>
      </div>
    </section>
  );
}
