/** One permission-filtered page read supplies routing and the shared theme on every native commerce route. */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppRegistry } from "../../../../frontend/src/shared/apps/AppSurfaces";
import { useStorefront } from "../../../../frontend/src/storefront/shell/StorefrontContext";
import { inheritedTheme, normalizePage, type Page } from "../model";
import { themeStyle } from "../Renderer";
type Published = {
  pages: Page[];
  available: boolean;
  loaded: boolean;
  error: boolean;
};
const Context = createContext<Published>({
  pages: [],
  available: false,
  loaded: false,
  error: false,
});
export const usePublishedSite = () => useContext(Context);
export default function PublishedSite({ children }: { children: ReactNode }) {
  const registry = useAppRegistry(),
    c = useStorefront();
  const [pages, setPages] = useState<Page[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(false);
  const latest = useRef(registry.request);
  latest.current = registry.request;
  const available = registry.publicApps.includes("site_builder");
  useEffect(() => {
    let active = true;
    setPages([]);
    setLoaded(false);
    setError(false);
    if (available)
      void (async () => {
        const rows: Page[] = [];
        let after: string | undefined;
        do {
          const value = await latest.current(
            "/store-api/apps/site_builder/actions/pages",
            { limit: 100, ...(after ? { after } : {}) },
          );
          if (!active) return;
          rows.push(...(value.elements ?? []).map(normalizePage));
          after = value.nextCursor ?? undefined;
        } while (after);
        setPages(rows);
        setLoaded(true);
      })().catch(() => {
        if (active) {
          setError(true);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [available, c.shopTenant, c.salesChannel, c.locale]);
  useEffect(() => {
    if (!pages.some((p) => p.slug === "home")) return;
    const shop = document.querySelector<HTMLElement>(".shop");
    if (!shop) return;
    const style = themeStyle(inheritedTheme(pages, c.salesChannel));
    const keys = Object.keys(style).filter((key) => key.startsWith("--"));
    const previous = keys.map((key) => [key, shop.style.getPropertyValue(key)]);
    for (const key of keys)
      shop.style.setProperty(
        key,
        String((style as Record<string, unknown>)[key]),
      );
    const font = shop.style.fontFamily;
    shop.style.fontFamily = style.fontFamily ?? "";
    shop.dataset.designed = "true";
    return () => {
      for (const [key, value] of previous)
        value
          ? shop.style.setProperty(key, value)
          : shop.style.removeProperty(key);
      shop.style.fontFamily = font;
      delete shop.dataset.designed;
    };
  }, [pages, c.salesChannel]);
  return (
    <Context.Provider value={{ pages, available, loaded, error }}>
      {children}
    </Context.Provider>
  );
}
