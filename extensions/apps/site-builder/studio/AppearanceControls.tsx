/** Shared page/channel appearance controls; null values retain native inheritance. */
import { defaultTheme, type Theme } from "../model";
import { useDesignText } from "./design-i18n";
export default function AppearanceControls({
  value,
  appearance,
  open,
  onChange,
}: {
  value: Theme;
  appearance?: Theme;
  open: boolean;
  onChange: (value: Theme) => void;
}) {
  const t = useDesignText();
  const patch = (next: Theme) => onChange({ ...value, ...next });
  return (
    <details open={open}>
      <summary>{t("theme")}</summary>
      {(["accent", "background", "foreground"] as const).map((k) => (
        <label className="designer-color" key={k}>
          {t(k)}
          <input
            type="color"
            value={value[k] ?? appearance?.[k] ?? defaultTheme[k] ?? "#ffffff"}
            onChange={(event) => patch({ [k]: event.target.value })}
          />
        </label>
      ))}
      <label>
        {t("font")}
        <select
          value={value.font ?? appearance?.font ?? "sans"}
          onChange={(event) =>
            patch({ font: event.target.value as Theme["font"] })
          }
        >
          <option value="sans">{t("sans")}</option>
          <option value="serif">{t("serif")}</option>
          <option value="mono">{t("mono")}</option>
        </select>
      </label>
      {(["radius", "spacing", "columns"] as const).map((k) => (
        <label key={k}>
          {t(k)} · {value[k] ?? appearance?.[k] ?? defaultTheme[k]}
          <input
            type="range"
            min={k === "columns" ? 1 : k === "spacing" ? 12 : 0}
            max={k === "columns" ? 4 : k === "spacing" ? 96 : 32}
            value={value[k] ?? appearance?.[k] ?? defaultTheme[k] ?? 0}
            onChange={(event) => patch({ [k]: Number(event.target.value) })}
          />
        </label>
      ))}
      <button onClick={() => onChange({})}>{t("inherit")}</button>
    </details>
  );
}
