/** Channel kind and POS presentation editor use the existing channel/content-language contract. */
import { useEffect, useState } from "react";
import CountryPicker from "../../shared/geography/CountryPicker";
import type { Country } from "../../shared/geography/geography-types";
import type { RequestFn } from "../shell/studio-types";
import type { Channel } from "./channel-model";
import { useChannelText } from "./channel-i18n";
import { usePosText } from "../pos/pos-i18n";
import Icon from "../../shared/ui/Icon";
import LocalizedField from "../../shared/i18n/LocalizedField";
export default function ChannelType({
  request,
  draft,
  patch,
  countries,
  countryError,
}: {
  request: RequestFn;
  draft: Channel;
  patch: (v: Partial<Channel["data"]>) => void;
  countries: string[];
  countryError?: string;
}) {
  const t = useChannelText();
  const p = usePosText();
  const [world, setWorld] = useState<Country[]>([]);
  useEffect(() => {
    let active = true;
    void request("/store-api/countries")
      .then((v) => {
        if (active && Array.isArray(v.countries)) setWorld(v.countries);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [request]);
  const config = draft.data.pos ?? {
    country: countries[0] ?? "",
    columns: 4,
    compact: false,
    receiptMessage: {},
  };
  return (
    <>
      <div className="channel-kind-grid" role="group" aria-label={t("type")}>
        {(["storefront", "headless", "pos", "marketplace"] as const).map(
          (kind) => (
            <button
              type="button"
              key={kind}
              className="channel-kind"
              disabled={
                (draft.id === "default" && kind !== "storefront") ||
                (!!draft.revision &&
                  (["pos", "marketplace"].includes(draft.data.kind) ||
                    ["pos", "marketplace"].includes(kind)))
              }
              aria-pressed={draft.data.kind === kind}
              onClick={() =>
                patch({ kind, pos: kind === "pos" ? config : undefined })
              }
            >
              <Icon
                name={
                  kind === "marketplace"
                    ? "layers"
                    : kind === "pos"
                      ? "register"
                      : kind === "headless"
                        ? "code"
                        : "globe"
                }
              />
              <strong>{t(kind)}</strong>
              <p>
                {t(
                  kind === "marketplace"
                    ? "marketplaceHint"
                    : kind === "pos"
                      ? "posHint"
                      : kind === "storefront"
                        ? "storefrontHint"
                        : "headlessHint",
                )}
              </p>
            </button>
          ),
        )}
      </div>
      {draft.data.kind === "pos" && (
        <section className="commerce-fields">
          <div className={countryError ? "field-invalid" : ""}>
            <CountryPicker
              countries={world.filter((c) => countries.includes(c.code))}
              label={p("country")}
              value={[config.country]}
              single
              onChange={(value) =>
                patch({ pos: { ...config, country: value[0] ?? "" } })
              }
            />
            {countryError && <small role="alert">{countryError}</small>}
          </div>
          <label>
            {p("columns")}
            <select
              value={config.columns}
              onChange={(e) =>
                patch({ pos: { ...config, columns: Number(e.target.value) } })
              }
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.compact}
              onChange={(e) =>
                patch({ pos: { ...config, compact: e.target.checked } })
              }
            />
            {p("compact")}
          </label>
          <LocalizedField
            label={p("message")}
            value={config.receiptMessage}
            maxLength={500}
            onChange={(value) =>
              patch({
                pos: {
                  ...config,
                  receiptMessage: value as Record<string, string>,
                },
              })
            }
          />
          <p>{p("posHint")}</p>
        </section>
      )}
    </>
  );
}
