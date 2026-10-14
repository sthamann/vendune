/** Public/private audience settings only apply to storefront and headless channel entry points. */
import type { Channel } from "./channel-model";
import { useChannelText } from "./channel-i18n";
export default function ChannelVisibility({
  draft,
  patch,
}: {
  draft: Channel;
  patch: (v: Partial<Channel["data"]>) => void;
}) {
  const t = useChannelText();
  return (
    <label className="channel-visibility">
      {t("visibility")}
      <select
        aria-label={t("visibility")}
        value={draft.data.visibility ?? "public"}
        onChange={(e) =>
          patch({ visibility: e.target.value as "public" | "private" })
        }
      >
        <option value="public">{t("public")}</option>
        <option value="private">{t("private")}</option>
      </select>
      <span>{t("visibilityHint")}</span>
    </label>
  );
}
