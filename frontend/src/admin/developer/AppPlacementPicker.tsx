/** Illustrated placement selection projects the existing registry; it never grants runtime access. */
import { useId } from "react";
import Icon, { type IconName } from "../../shared/ui/Icon";
import {
  useAssistantText,
  type AssistantKey,
} from "../../shared/i18n/app-assistant-i18n";
import { placements, type AppKind } from "./assistant-model";
const groups: { title: AssistantKey; locations: string[] }[] = [
  {
    title: "shopAreas",
    locations: [
      "product.detail",
      "storefront.home",
      "storefront.header",
      "storefront.page",
      "storefront.block",
    ],
  },
  {
    title: "buyingAreas",
    locations: [
      "cart.summary",
      "checkout.content",
      "checkout.summary",
      "account.overview",
    ],
  },
  {
    title: "adminAreas",
    locations: [
      "admin.navigation",
      "admin.product.general",
      "admin.product.tab",
      "admin.customer",
      "admin.order",
    ],
  },
  {
    title: "posAreas",
    locations: ["admin.pos.catalog", "admin.pos.cart", "admin.pos.receipt"],
  },
  { title: "companyAreas", locations: ["admin.b2b.company", "admin.b2b.unit"] },
];
const icons: Record<string, IconName> = {
  "product.detail": "box",
  "storefront.home": "globe",
  "storefront.header": "frame",
  "storefront.page": "form",
  "storefront.block": "layers",
  "cart.summary": "box",
  "checkout.content": "input",
  "checkout.summary": "card",
  "account.overview": "people",
  "admin.navigation": "menu",
  "admin.product.general": "input",
  "admin.product.tab": "tabs",
  "admin.customer": "people",
  "admin.order": "form",
  "admin.pos.catalog": "table",
  "admin.pos.cart": "register",
  "admin.pos.receipt": "form",
  "admin.b2b.company": "building",
  "admin.b2b.unit": "people",
};
function PlacementSketch({ location }: { location: string }) {
  const admin = location.startsWith("admin."),
    checkout = location.startsWith("checkout."),
    product = location === "product.detail",
    banner = location === "storefront.header",
    side = location === "cart.summary" || location === "checkout.summary";
  return (
    <svg
      className="app-placement-sketch"
      viewBox="0 0 180 84"
      aria-hidden="true"
      fill="none"
    >
      <rect
        className="sketch-page"
        x="12"
        y="5"
        width="156"
        height="74"
        rx="5"
      />
      <path className="sketch-line" d="M20 14h13m103 0h7m5 0h7M12 22h156" />
      {admin ? (
        <>
          <path
            className="sketch-line"
            d="M42 23v55M20 31h14m-14 9h14m-14 9h14m-14 9h14"
          />
          <rect
            className="sketch-fill"
            x="51"
            y="29"
            width="106"
            height="8"
            rx="2"
          />
          <rect
            className="sketch-fill"
            x="51"
            y="43"
            width="70"
            height="25"
            rx="2"
          />
        </>
      ) : (
        <>
          <rect
            className="sketch-fill"
            x="22"
            y="29"
            width={product ? 54 : side ? 80 : 136}
            height={checkout ? 8 : 28}
            rx="3"
          />
          <path
            className="sketch-line"
            d={product ? "M86 32h65m-65 8h52m-52 8h37" : "M22 64h83m-83 6h63"}
          />
        </>
      )}
      <rect
        className="sketch-highlight"
        x={
          admin
            ? location === "admin.navigation"
              ? 18
              : 51
            : side
              ? 114
              : product
                ? 85
                : 22
        }
        y={
          admin
            ? location === "admin.product.tab"
              ? 29
              : 46
            : banner
              ? 25
              : checkout
                ? 43
                : product
                  ? 55
                  : 32
        }
        width={
          admin
            ? location === "admin.navigation"
              ? 18
              : 106
            : side
              ? 44
              : product
                ? 72
                : 136
        }
        height={
          admin
            ? location === "admin.product.tab"
              ? 9
              : 20
            : banner
              ? 10
              : checkout
                ? 25
                : product
                  ? 15
                  : 26
        }
        rx="3"
      />
      <g
        className="sketch-symbol"
        transform={`translate(${admin ? 95 : side ? 131 : product ? 116 : 85} ${admin ? 51 : banner ? 26 : product ? 58 : 39})`}
      >
        <path d="M0 5h10M5 0v10" />
      </g>
    </svg>
  );
}
export default function AppPlacementPicker({
  kind,
  selected,
  onChange,
}: {
  kind: AppKind;
  selected: string[];
  onChange: (locations: string[]) => void;
}) {
  const { t } = useAssistantText(),
    id = useId();
  const full = selected.length >= 6;
  return (
    <fieldset
      className="app-creation-placements"
      aria-describedby={`${id}-hint`}
    >
      <legend>{t("placement")}</legend>
      <div className="app-creation-selection-heading">
        <p id={`${id}-hint`}>{t("placementsHint")}</p>
        <span role="status">
          {t("selectionCount").replace("{count}", String(selected.length))}
        </span>
      </div>
      {full && (
        <p className="app-creation-limit" role="status">
          {t("selectionLimit")}
        </p>
      )}
      {groups.map((group) => {
        const visible = group.locations.filter(
          (v) =>
            kind === "combined" ||
            (kind === "frontend"
              ? !v.startsWith("admin.")
              : v.startsWith("admin.")),
        );
        return visible.length ? (
          <fieldset key={group.title} className="app-placement-group">
            <legend>{t(group.title)}</legend>
            <div className="app-creation-placement-grid">
              {visible.map((v) => (
                <label
                  key={v}
                  className="app-creation-placement"
                  data-selected={selected.includes(v)}
                  data-disabled={full && !selected.includes(v)}
                >
                  <input
                    type="checkbox"
                    aria-label={t(placements[v])}
                    checked={selected.includes(v)}
                    disabled={full && !selected.includes(v)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...selected, v]
                          : selected.filter((x) => x !== v),
                      )
                    }
                  />
                  <PlacementSketch location={v} />
                  <span>
                    <Icon name={icons[v]} size={17} />
                    <strong>{t(placements[v])}</strong>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null;
      })}
    </fieldset>
  );
}
