/** Shared page renderer: Studio previews and published shops use exactly these registered components. */
import type { CSSProperties } from "react";
import type { Page, Theme } from "./model";
import { defaultTheme, fonts, explicitTheme } from "./model";
import { contentText } from "../../../frontend/src/shared/i18n/content-language";
import RichDescription from "../../../frontend/src/shared/content/RichDescription";
import type { RequestFn } from "../../../frontend/src/shared/api/types";
import PublicFormBlock from "../../../frontend/src/shared/apps/PublicFormBlock";
import { AppSurfaceSlot } from "../../../frontend/src/shared/apps/AppSurfaces";
import { useEditorText } from "./studio/editor-i18n";
import AppElement from "./AppElement";
import "./site.css";
export type SiteProduct = {
  id: string;
  name: string;
  price: number;
  currency?: string;
  media: { id: string; url: string; view: string }[];
};
export function themeStyle(theme: Theme): CSSProperties {
  const t = { ...defaultTheme, ...explicitTheme(theme) };
  const rgb = String(t.accent)
    .slice(1)
    .match(/../g)!
    .map((h) => {
      const c = parseInt(h, 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return {
    "--site-accent": t.accent,
    "--site-accent-text": luminance > 0.179 ? "#000000" : "#ffffff",
    "--site-background": t.background,
    "--site-foreground": t.foreground,
    "--site-radius": `${t.radius}px`,
    "--site-spacing": `${t.spacing}px`,
    "--site-columns": t.columns,
    fontFamily: fonts[t.font ?? "sans"],
  } as CSSProperties;
}
export default function SiteRenderer({
  page,
  pages = [],
  products,
  theme,
  language,
  mainLocale,
  request,
  channel,
  selected,
  onSelect,
  onInline,
  onProduct,
  onAdd,
}: {
  page: Page;
  pages?: Page[];
  products: SiteProduct[];
  theme: Theme;
  language: string;
  mainLocale: string;
  request: RequestFn;
  channel: string;
  selected?: string;
  onSelect?: (id: string) => void;
  onInline?: (id: string, text: string) => void;
  onProduct?: (id: string) => void;
  onAdd?: (id: string) => void;
}) {
  const t = useEditorText(),
    preview = !!onSelect;
  const text = (map: Parameters<typeof contentText>[0]) =>
    contentText(map, language, mainLocale);
  const money = (p: SiteProduct) =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency: p.currency ?? "EUR",
    }).format(p.price);
  return (
    <article
      className={`site-document${preview ? " is-design-preview" : ""}`}
      style={themeStyle(theme)}
      data-site-page={page.id}
    >
      {pages.filter((p) => p.kind !== "article").length > 1 && (
        <nav className="site-navigation" aria-label={text(page.title)}>
          {pages
            .filter((p) => p.kind !== "article")
            .map((p) => (
              <a
                key={p.id}
                href={`#page/${encodeURIComponent(p.slug)}`}
                onClick={preview ? (e) => e.preventDefault() : undefined}
              >
                {text(p.title)}
              </a>
            ))}
        </nav>
      )}
      {page.content.blocks.length === 0 && (
        <p className="site-empty">{t("empty")}</p>
      )}
      {page.content.blocks.map((b) => {
        const title = text(b.text),
          rows =
            b.productMode === "selected" || b.products.length
              ? products.filter((p) => b.products.includes(p.id))
              : products;
        const photo =
          b.image || (b.kind === "hero" ? rows[0]?.media[0]?.url : "");
        return (
          <section
            key={b.id}
            data-block-id={b.id}
            tabIndex={preview ? 0 : undefined}
            aria-label={preview ? title || b.kind : undefined}
            className={`site-section site-${b.kind}${selected === b.id ? " is-selected" : ""}`}
            onClick={
              preview
                ? (e) => {
                    e.stopPropagation();
                    onSelect(b.id);
                  }
                : undefined
            }
            onKeyDown={
              preview
                ? (e) => {
                    if (e.key === "Enter") onSelect(b.id);
                  }
                : undefined
            }
          >
            <div className="site-section-content">
              {title && (
                <h2
                  contentEditable={!!onInline && selected === b.id}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const value = e.currentTarget.textContent ?? "";
                    if (onInline && value !== title) onInline(b.id, value);
                  }}
                >
                  {title}
                </h2>
              )}
              {b.rich && (
                <RichDescription
                  blocks={
                    b.rich[language] ??
                    b.rich[language.split("-")[0]] ??
                    b.rich[mainLocale] ??
                    b.rich[mainLocale.split("-")[0]] ??
                    []
                  }
                />
              )}
              {b.kind === "hero" && rows[0] && (
                <button
                  className="site-cta"
                  type="button"
                  onClick={(e) => {
                    if (preview) return;
                    e.stopPropagation();
                    onProduct?.(rows[0].id);
                  }}
                >
                  {rows[0].name} ↗
                </button>
              )}
            </div>
            {photo && ["hero", "image"].includes(b.kind) && (
              <figure>
                <img
                  src={photo}
                  alt={title}
                  loading={b.kind === "hero" ? "eager" : "lazy"}
                />
              </figure>
            )}
            {b.kind === "products" && (
              <div className="site-product-grid">
                {rows.map((p) => (
                  <article key={p.id} className="site-product">
                    <button
                      className="site-product-link"
                      onClick={(e) => {
                        if (preview) return;
                        e.stopPropagation();
                        onProduct?.(p.id);
                      }}
                    >
                      {p.media[0] && (
                        <img src={p.media[0].url} alt={p.name} loading="lazy" />
                      )}
                      <strong>{p.name}</strong>
                      <span>{money(p)}</span>
                    </button>
                    <button
                      className="site-cta"
                      disabled={preview}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd?.(p.id);
                      }}
                    >
                      {t("buy")}
                    </button>
                  </article>
                ))}
              </div>
            )}
            {b.kind === "app" && b.extension && (
              <AppElement
                element={b.extension}
                channel={channel}
                preview={preview}
              />
            )}
            {b.kind === "form" && (
              <PublicFormBlock
                key={`${page.id}:${b.id}:${language}`}
                block={b}
                page={page.id}
                channel={channel}
                language={language}
                mainLocale={mainLocale}
                request={request}
                preview={preview}
              />
            )}
            {b.kind === "articles" && (
              <div className="site-articles">
                {pages
                  .filter(
                    (p) =>
                      p.kind === "article" &&
                      (!page.category || p.category === page.category),
                  )
                  .map((p) => (
                    <a
                      key={p.id}
                      href={`#page/${encodeURIComponent(p.slug)}`}
                      onClick={preview ? (e) => e.preventDefault() : undefined}
                    >
                      <small>
                        {p.category} · {p.author}
                      </small>
                      <h3>{text(p.title)}</h3>
                      <span>↗</span>
                    </a>
                  ))}
              </div>
            )}
          </section>
        );
      })}
      {!preview && page.slug === "home" && (
        <AppSurfaceSlot
          location="storefront.home"
          context={{ salesChannel: channel }}
        />
      )}
    </article>
  );
}
