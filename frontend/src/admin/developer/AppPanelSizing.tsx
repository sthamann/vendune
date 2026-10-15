/** Local panel widths contain presentation only; pointer and keyboard resizing never change the Manifest. */
import { useState, type CSSProperties } from "react";
import { useAppWorkspaceText } from "../../shared/i18n/app-workspace-i18n";
export function useAppPanelSizing() {
  const [widths, setWidths] = useState(() => {
    try {
      const v = JSON.parse(
        localStorage.getItem("veyndo:app-panel-widths") ?? "{}",
      );
      return {
        palette: Math.max(148, Math.min(280, Number(v.palette) || 180)),
        inspector: Math.max(280, Math.min(500, Number(v.inspector) || 340)),
      };
    } catch {
      return { palette: 180, inspector: 340 };
    }
  });
  const resize = (key: "palette" | "inspector", value: number) =>
    setWidths((old) => {
      const next = {
        ...old,
        [key]: Math.round(
          Math.max(
            key === "palette" ? 148 : 280,
            Math.min(key === "palette" ? 280 : 500, value),
          ),
        ),
      };
      try {
        localStorage.setItem("veyndo:app-panel-widths", JSON.stringify(next));
      } catch {}
      return next;
    });
  return {
    widths,
    resize,
    style: {
      "--app-palette-width": `${widths.palette}px`,
      "--app-inspector-width": `${widths.inspector}px`,
    } as CSSProperties,
  };
}
export function AppPanelHandle({
  side,
  value,
  onChange,
}: {
  side: "palette" | "inspector";
  value: number;
  onChange: (n: number) => void;
}) {
  const t = useAppWorkspaceText();
  return (
    <div
      className={`app-panel-resize app-resize-${side}`}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={t(side === "palette" ? "paletteWidth" : "inspectorWidth")}
      aria-valuenow={value}
      aria-valuemin={side === "palette" ? 148 : 280}
      aria-valuemax={side === "palette" ? 280 : 500}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          onChange(
            value +
              (e.key === "ArrowRight" ? 1 : -1) *
                (side === "palette" ? 1 : -1) *
                16,
          );
        }
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.start = String(e.clientX);
        e.currentTarget.dataset.width = String(value);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          onChange(
            Number(e.currentTarget.dataset.width) +
              (e.clientX - Number(e.currentTarget.dataset.start)) *
                (side === "palette" ? 1 : -1),
          );
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    />
  );
}
