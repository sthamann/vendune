/** Unit allowlists reference the existing translated shipping/payment owner; empty means inherited availability. */
import type { Unit } from "../../shared/b2b/types";
import { inheritedText } from "../../shared/geography/geography-types";
import { useLocale } from "../../shared/i18n/i18n";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
export default function UnitMethods({
  data,
  config,
  onChange,
  disabled,
}: {
  data: Unit["data"];
  config: any;
  onChange: (v: Partial<Unit["data"]>) => void;
  disabled: boolean;
}) {
  const t = useB2BText(),
    { locale } = useLocale();
  return (
    <section className="b2b-fields">
      {(["shipping", "payments"] as const).map((area) => {
        const field =
          area === "shipping" ? "allowedShipping" : "allowedPayments";
        return (
          <div key={area}>
            <h3>{t(area)}</h3>
            <p className="b2b-muted">{t("allMethods")}</p>
            <div className="b2b-unit-tabs">
              {(config[area] ?? []).map((m: any) => (
                <button
                  type="button"
                  key={m.id}
                  disabled={disabled}
                  aria-pressed={data[field].includes(m.id)}
                  onClick={() =>
                    onChange({
                      [field]: data[field].includes(m.id)
                        ? data[field].filter((id) => id !== m.id)
                        : [...data[field], m.id],
                    })
                  }
                >
                  {inheritedText(
                    m.translations ?? {},
                    locale,
                    config.mainLocale,
                    "name",
                  ) || m.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
