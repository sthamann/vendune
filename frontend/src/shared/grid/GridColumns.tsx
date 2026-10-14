/** Accessible column ordering/visibility controls provide keyboard and touch alternatives to drag headers. */
import { useRef, useEffect } from "react";
import Icon from "../ui/Icon";
import { useGridText } from "./grid-i18n";
import { moveColumn, type GridLayout } from "./preferences";
export default function GridColumns({
  columns,
  layout,
  onChange,
  onReset,
}: {
  columns: { id: string; label: string }[];
  layout: GridLayout;
  onChange: (v: GridLayout) => void;
  onReset: () => void;
}) {
  const { g } = useGridText();
  const ref = useRef<HTMLDetailsElement>(null);
  const close = (focus = false) => {
    if (ref.current) {
      ref.current.open = false;
      if (focus) ref.current.querySelector("summary")?.focus();
    }
  };
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  return (
    <details
      ref={ref}
      className="agent-grid-column-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close(true);
        }
      }}
    >
      <summary>
        <Icon name="table" />
        {g("columns")}
      </summary>
      <div className="agent-grid-column-panel">
        <div className="agent-grid-popover-heading">
          <strong>{g("customize")}</strong>
          <button
            type="button"
            aria-label={g("closeColumns")}
            onClick={() => close(true)}
          >
            <Icon name="close" />
          </button>
        </div>
        <p>{g("columnsHint")}</p>
        {layout.order.map((id, i) => {
          const column = columns.find((c) => c.id === id);
          if (!column) return null;
          const visible = !layout.hidden.includes(id);
          return (
            <div className="agent-grid-column-option" key={id}>
              <label>
                <span className="sr-only">{g("showColumn")}: </span>
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={
                    visible && layout.hidden.length === columns.length - 1
                  }
                  onChange={() =>
                    onChange({
                      ...layout,
                      hidden: visible
                        ? [...layout.hidden, id]
                        : layout.hidden.filter((x) => x !== id),
                    })
                  }
                />
                {column.label}
              </label>
              <button
                type="button"
                disabled={i === 0}
                aria-label={`${g("left")}: ${column.label}`}
                onClick={() =>
                  onChange(moveColumn(layout, id, layout.order[i - 1]))
                }
              >
                ←
              </button>
              <button
                type="button"
                disabled={i === layout.order.length - 1}
                aria-label={`${g("right")}: ${column.label}`}
                onClick={() => {
                  const order = [...layout.order];
                  [order[i], order[i + 1]] = [order[i + 1], order[i]];
                  onChange({ ...layout, order });
                }}
              >
                →
              </button>
            </div>
          );
        })}
        <label className="agent-grid-column-option">
          <input
            type="checkbox"
            checked={layout.compact}
            onChange={(e) => onChange({ ...layout, compact: e.target.checked })}
          />
          {g("compact")}
        </label>
        <button type="button" className="studio-secondary" onClick={onReset}>
          {g("reset")}
        </button>
      </div>
    </details>
  );
}
