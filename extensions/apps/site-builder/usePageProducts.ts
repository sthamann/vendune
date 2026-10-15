/** Resolve explicit selections through the native bounded catalogue, independent of the first catalogue/search page. */
import { useEffect, useRef, useState } from "react";
import type { Page } from "./model";
import type { SiteProduct } from "./Renderer";
export function selectedProducts(page?: Page) {
  return [
    ...new Set(page?.content.blocks.flatMap((block) => block.products) ?? []),
  ].sort();
}
export default function usePageProducts<T extends SiteProduct>(
  page: Page | undefined,
  base: T[],
  scope: string,
  load: (ids: string[]) => Promise<T[]>,
) {
  const ids = JSON.stringify(selectedProducts(page));
  const latest = useRef(load);
  latest.current = load;
  const [result, setResult] = useState<{
    key: string;
    products: T[];
    error: boolean;
  }>();
  const key = `${scope}:${ids}`;
  useEffect(() => {
    let active = true;
    const selected: string[] = JSON.parse(ids);
    void (async () => {
      const products: T[] = [];
      for (let start = 0; start < selected.length; start += 100) {
        products.push(
          ...(await latest.current(selected.slice(start, start + 100))),
        );
        if (!active) return;
      }
      if (active) setResult({ key, products, error: false });
    })().catch(() => {
      if (active) setResult({ key, products: [], error: true });
    });
    return () => {
      active = false;
    };
  }, [key]);
  const current = result?.key === key ? result : undefined;
  const products = [
    ...new Map(
      [...base, ...(current?.products ?? [])].map((p) => [p.id, p]),
    ).values(),
  ];
  return { products, error: current?.error ?? false };
}
