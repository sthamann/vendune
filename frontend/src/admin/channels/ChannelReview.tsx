/** A readable summary of the exact native channel draft before its revisioned save. */
import type { Channel } from "./channel-model";
import { useChannelText } from "./channel-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
export default function ChannelReview({
  draft,
  mainLocale,
}: {
  draft: Channel;
  mainLocale: string;
}) {
  const t = useChannelText(),
    { locale } = useLocale();
  return (
    <div className="channel-review">
      <strong>{contentText(draft.data.name, locale, mainLocale)}</strong>
      <p>
        {t(draft.data.kind)} ·{" "}
        {draft.data.locales
          .map(
            (l) =>
              new Intl.DisplayNames([locale], { type: "language" }).of(l) ?? l,
          )
          .join(" · ")}
      </p>
      <p>
        {draft.data.productIds.length
          ? `${t("selected")}: ${draft.data.productIds.length}`
          : t("all")}
      </p>
      <p>{t("scopeHint")}</p>
    </div>
  );
}
