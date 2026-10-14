/** Explicit subset editor uses server admission, parent command fencing and immutable order quantities. */
import { useState } from "react";
import { useShipmentText } from "../../shared/i18n/shipment-i18n";
export type ShipmentPosition = { id: string; quantity: number };
export default function ShipmentSplit({
  delivery,
  labels,
  enabled,
  busy,
  onSplit,
}: {
  delivery: { positions: ShipmentPosition[] };
  labels: Record<string, string>;
  enabled: boolean;
  busy: boolean;
  onSplit: (positions: ShipmentPosition[]) => Promise<boolean>;
}) {
  const text = useShipmentText();
  const [open, setOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  if (!enabled) return null;
  const positions = delivery.positions ?? [];
  const total = positions.reduce((sum, p) => sum + p.quantity, 0);
  return (
    <div className="shipment-split">
      <button
        type="button"
        disabled={busy}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {text("split")}
      </button>
      {open && (
        <form
          className="shipment-split-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            const selected = positions.map((p) => ({
              id: p.id,
              quantity: Number(amounts[p.id] ?? 0),
            }));
            const moved = selected.reduce((sum, p) => sum + p.quantity, 0);
            if (
              selected.some(
                (p, i) =>
                  !Number.isInteger(p.quantity) ||
                  p.quantity < 0 ||
                  p.quantity > positions[i].quantity,
              ) ||
              moved <= 0 ||
              moved >= total
            ) {
              setError(text("invalid"));
              return;
            }
            setError("");
            if (await onSplit(selected.filter((p) => p.quantity > 0))) {
              setOpen(false);
              setAmounts({});
            }
          }}
        >
          <p>{text("hint")}</p>
          {positions.map((p) => (
            <label key={p.id}>
              <span>{labels[p.id] ?? p.id}</span>
              <small>
                {text("quantity")} · {p.quantity}
              </small>
              <input
                type="number"
                min={0}
                max={p.quantity}
                step={1}
                value={amounts[p.id] ?? "0"}
                disabled={busy}
                onChange={(e) =>
                  setAmounts({ ...amounts, [p.id]: e.target.value })
                }
              />
            </label>
          ))}
          {error && <p role="alert">{error}</p>}
          <div className="studio-actions">
            <button className="studio-primary" disabled={busy}>
              {text("create")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {text("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
