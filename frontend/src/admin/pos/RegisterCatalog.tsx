/** Bounded product pages and keyboard-wedge scanner input; feedback uses the authoritative cart. */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { useRegister } from "./useRegister";
import { usePosText } from "./pos-i18n";
import Icon from "../../shared/ui/Icon";
import type { PosProduct } from "./pos-model";
import { useLocale } from "../../shared/i18n/i18n";
import type { Channel } from "../channels/channel-model";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
export default function RegisterCatalog({
  register: r,
  channel,
}: {
  register: ReturnType<typeof useRegister>;
  channel: Channel;
}) {
  const t = usePosText();
  const search = useRef<HTMLInputElement>(null);
  const [added, setAdded] = useState("");
  const add = async (p: PosProduct) => {
    const name = await r.add(p);
    if (name) setAdded(name);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !target.matches("input,textarea,select") &&
        !target.isContentEditable &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const { locale } = useLocale();
  const [variants, setVariants] = useState<PosProduct[] | null>(null);
  const [variantAfter, setVariantAfter] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (variants) dialog.current?.showModal();
  }, [variants]);
  const [family, setFamily] = useState("");
  const pick = async (p: PosProduct) => {
    const v = await r.command("detail", {
      productId: p.id,
      cartToken: r.cart?.token,
    });
    const children: PosProduct[] = v.variants;
    if (
      children.some(
        (v) =>
          !!v.parentId || (v as unknown as { parent_id?: string }).parent_id,
      )
    ) {
      setFamily(p.id);
      setVariants(children);
      setVariantAfter(v.variantsPagination.nextCursor);
    } else await add(p);
  };
  const loadVariants = async () => {
    const v = await r.command("detail", {
      productId: family,
      after: variantAfter,
      cartToken: r.cart?.token,
    });
    setVariants((old) => [...(old ?? []), ...v.variants]);
    setVariantAfter(v.variantsPagination.nextCursor);
  };
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => void r.catalog(query), 250);
    return () => clearTimeout(timer);
  }, [query, r.catalog]);
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: r.cart?.price.currency ?? "EUR",
    }).format(n);
  return (
    <section className="pos-catalog">
      <form
        className="pos-search"
        onSubmit={(e) => {
          e.preventDefault();
          void r.catalog("", query.trim()).then((ps) => {
            if (ps?.length === 1) {
              void add(ps[0]);
              setQuery("");
            }
          });
        }}
      >
        <Icon name="search" />
        <input
          ref={search}
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button disabled={r.busy || !query.trim()}>{t("scan")}</button>
      </form>
      <div className="pos-catalog-status">
        <small>{t("shortcuts")}</small>
        <span role="status">{added && `${t("added")}: ${added}`}</span>
      </div>
      {error && <p role="alert">{error}</p>}
      <AppSurfaceSlot
        location="admin.pos.catalog"
        context={{ salesChannelId: channel.id }}
      />
      <div
        className={`pos-products ${channel.data.pos?.compact ? "is-compact" : ""}`}
        style={
          { "--pos-columns": channel.data.pos?.columns ?? 4 } as CSSProperties
        }
      >
        {r.products.map((p) => (
          <button
            className="pos-product"
            disabled={r.busy || p.stock <= 0}
            key={p.id}
            aria-label={`${t("add")}: ${p.name}`}
            onClick={() =>
              void pick(p).catch((error) => setError(error.message))
            }
          >
            <div className="pos-product-image">
              {p.media?.[0]?.url ? (
                <img src={p.media[0].url} alt="" loading="lazy" />
              ) : (
                <Icon name="box" size={48} />
              )}
              <span>{p.stock}</span>
            </div>
            <strong>{p.name}</strong>
            <span className="pos-product-price">
              {money(
                p.calculated_price?.unitPrice ??
                  (typeof p.price === "number"
                    ? p.price
                    : (p.price.unitPrice ?? p.price.totalPrice ?? 0)),
              )}
              <Icon name="plus" />
            </span>
          </button>
        ))}
      </div>
      {!r.products.length && (
        <div className="pos-empty">
          <Icon name="search" size={36} />
          <p>{t("unavailable")}</p>
        </div>
      )}
      {r.after && (
        <button
          disabled={r.busy}
          onClick={() => void r.catalog(query, undefined, r.after!)}
        >
          {t("more")}
        </button>
      )}
      {variants && (
        <dialog
          ref={dialog}
          onCancel={() => setVariants(null)}
          className="pos-variants"
          role="dialog"
          aria-modal="true"
          aria-label={t("variants")}
        >
          <header>
            <h2>{t("variants")}</h2>
            <button onClick={() => setVariants(null)} aria-label={t("close")}>
              <Icon name="close" />
            </button>
          </header>
          {variants.map((v) => (
            <button
              key={v.id}
              disabled={r.busy || v.stock <= 0}
              onClick={() => void add(v).then(() => setVariants(null))}
            >
              {v.name} · {Object.values(v.options ?? {}).join(" / ")}
              <strong>
                {money(typeof v.price === "number" ? v.price : 0)}
              </strong>
            </button>
          ))}
          {variantAfter && (
            <button onClick={() => void loadVariants()}>{t("more")}</button>
          )}
        </dialog>
      )}
    </section>
  );
}
