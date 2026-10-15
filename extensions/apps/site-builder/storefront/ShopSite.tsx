/** Standard-shop routing is an app mount; commerce products, cart, account and checkout keep their original owners. */
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import { useEffect, type ReactNode } from "react";
import { useAppRegistry } from "../../../../frontend/src/shared/apps/AppSurfaces";
import { useStorefront } from "../../../../frontend/src/storefront/shell/StorefrontContext";
import { productURL } from "../../../../frontend/src/storefront/catalog/product-url";
import { effectivePages, inheritedTheme, explicitTheme } from "../model";
import SiteRenderer from "../Renderer";
import { useEditorText } from "../studio/editor-i18n";
import { usePublishedSite } from "./PublishedSite";
function safeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
export default function ShopSite({ fallback }: { fallback: ReactNode }) {
  const registry = useAppRegistry(),
    c = useStorefront(),
    t = useEditorText();
  const { pages, loaded, error, available } = usePublishedSite();
  const visible = effectivePages(pages, c.salesChannel),
    slug = c.appPath.startsWith("#page/")
      ? safeSlug(c.appPath.slice(6))
      : "home";
  const page = visible.find((p) => p.slug === slug),
    theme = {
      ...inheritedTheme(pages, c.salesChannel),
      ...explicitTheme(page?.theme),
    };
  useEffect(() => {
    if (!page) return;
    const previousTitle = document.title;
    document.title = `${contentText(page.title, c.locale, registry.mainLocale)} · ${c.company.brandName || c.shopTenant}`;
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const existed = !!meta,
      oldDescription = meta?.content;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.append(meta);
    }
    meta.content = contentText(
      page.seo?.description ?? {},
      c.locale,
      registry.mainLocale,
    );
    return () => {
      if (existed) meta!.content = oldDescription ?? "";
      else meta!.remove();
      document.title = previousTitle;
    };
  }, [page, c.locale, registry.mainLocale, c.salesChannel]);
  if (!available) return fallback;
  if (!loaded)
    return (
      <p className="site-empty" role="status">
        {c.s("loading")}
      </p>
    );
  if (!page)
    return c.appPath.startsWith("#page/") ? (
      <p className="site-empty" role="alert">
        {t("unavailable")}
      </p>
    ) : error ? (
      <>
        <p role="alert">{t("unavailable")}</p>
        {fallback}
      </>
    ) : (
      fallback
    );
  return (
    <main>
      <SiteRenderer
        page={page}
        pages={visible}
        products={c.products}
        theme={theme}
        language={c.locale}
        mainLocale={registry.mainLocale}
        channel={c.salesChannel}
        request={registry.request}
        onProduct={(id) => {
          location.href = productURL(c.products.find((p) => p.id === id)!);
        }}
        onAdd={(id) => {
          const p = c.products.find((p) => p.id === id);
          if (p) void c.add(p.id, 1);
        }}
      />
    </main>
  );
}
