/** Layout preferences contain column IDs only, scoped to current origin/shop/environment; never customer rows or search text. */
import { shopScope } from "../api/shop-scope";
export type GridLayout = {
  order: string[];
  hidden: string[];
  compact: boolean;
};
const key = (id: string) =>
  `veyndo-grid:v1:${shopScope()}:${new URLSearchParams(location.search).get("sandbox") ?? "live"}:${id}`;
export function normalizeLayout(
  ids: string[],
  hidden: string[],
  value?: Partial<GridLayout>,
): GridLayout {
  const order = [
    ...new Set(value?.order?.filter((id) => ids.includes(id)) ?? []),
  ];
  return {
    order: [...order, ...ids.filter((id) => !order.includes(id))],
    hidden: [
      ...new Set(
        [
          ...(value?.hidden ?? hidden),
          ...hidden.filter((id) => !value?.order?.includes(id)),
        ].filter((id) => ids.includes(id)),
      ),
    ].slice(0, Math.max(0, ids.length - 1)),
    compact: value?.compact === true,
  };
}
export function readLayout(id: string, ids: string[], hidden: string[]) {
  try {
    return normalizeLayout(
      ids,
      hidden,
      JSON.parse(localStorage.getItem(key(id)) ?? "null") ?? undefined,
    );
  } catch {
    return normalizeLayout(ids, hidden);
  }
}
export function saveLayout(id: string, value: GridLayout) {
  try {
    localStorage.setItem(key(id), JSON.stringify(value));
  } catch {
    /* Private browsing still supports the current session. */
  }
}
export function moveColumn(layout: GridLayout, id: string, target: string) {
  const order = layout.order.filter((x) => x !== id);
  const index = order.indexOf(target);
  if (index < 0 || !layout.order.includes(id)) return layout;
  order.splice(index, 0, id);
  return { ...layout, order };
}
