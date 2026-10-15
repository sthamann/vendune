/** Property edits and WYSIWYG content update the same structured page record as agents and MCP. */
import { useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { useContentLanguage } from "../../../../frontend/src/shared/i18n/ContentLanguage";
import LocalizedField from "../../../../frontend/src/shared/i18n/LocalizedField";
import RichEditor from "../../../../frontend/src/shared/content/editor/RichEditor";
import type { Block, Page, Theme, FormField } from "../model";
import type { SiteProduct } from "../Renderer";
import AppearanceControls from "./AppearanceControls";
import { useDesignText } from "./design-i18n";
import { useEditorText } from "./editor-i18n";
function localTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export default function PageInspector({
  page,
  block,
  products,
  disabled,
  appearance,
  onChange,
  onSelect,
  onSearch,
}: {
  page: Page;
  block?: Block;
  products: SiteProduct[];
  request: RequestFn;
  disabled: boolean;
  appearance?: Theme;
  onChange: (page: Page) => void;
  onSelect: (id: string) => void;
  onSearch: (query: string) => Promise<void>;
}) {
  const t = useDesignText(),
    e = useEditorText(),
    { language, mainLocale } = useContentLanguage(),
    [search, setSearch] = useState("");
  const patch = (v: Partial<Page>) => onChange({ ...page, ...v });
  const editBlock = (v: Partial<Block>) =>
    block &&
    patch({
      content: {
        blocks: page.content.blocks.map((b) =>
          b.id === block.id ? { ...b, ...v } : b,
        ),
      },
    });
  return (
    <div className="designer-properties">
      <h2>{t("properties")}</h2>
      <fieldset disabled={disabled}>
        <details open={!block}>
          <summary>{t("pageDetails")}</summary>
          <LocalizedField
            label={t("titleField")}
            value={page.title}
            onChange={(title) => patch({ title })}
            maxLength={2000}
            required
          />
          <label>
            {t("slug")}
            <input
              value={page.slug}
              maxLength={100}
              pattern="[a-z0-9-]+"
              onChange={(event) => patch({ slug: event.target.value })}
            />
          </label>
          <label>
            {t("status")}
            <select
              value={page.status}
              onChange={(event) =>
                patch({ status: event.target.value as Page["status"] })
              }
            >
              {(["draft", "published", "archived"] as const).map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("schedule")}
            <input
              type="datetime-local"
              value={localTime(page.starts_at)}
              onChange={(event) =>
                patch({
                  starts_at: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : null,
                })
              }
            />
          </label>
          <LocalizedField
            label={e("seo")}
            value={page.seo?.description ?? {}}
            onChange={(description) => patch({ seo: { description } })}
            maxLength={300}
            multiline
          />
          {(page.kind === "article" || page.kind === "blog") && (
            <>
              <label>
                {e("author")}
                <input
                  value={page.author ?? ""}
                  maxLength={100}
                  onChange={(event) => patch({ author: event.target.value })}
                />
              </label>
              <label>
                {e("category")}
                <input
                  value={page.category ?? ""}
                  maxLength={100}
                  onChange={(event) => patch({ category: event.target.value })}
                />
              </label>
            </>
          )}
        </details>
        <AppearanceControls
          value={page.theme}
          appearance={appearance}
          open={!block}
          onChange={(theme) => patch({ theme })}
        />
        {block && (
          <section className="designer-block-properties">
            <h3>{t(block.kind)}</h3>
            <LocalizedField
              label={t("titleField")}
              value={block.text}
              onChange={(text) => editBlock({ text })}
              maxLength={2000}
            />
            {(["hero", "text"] as string[]).includes(block.kind) && (
              <RichEditor
                key={`${page.id}:${block.id}`}
                value={{
                  ...block.rich,
                  [language]:
                    block.rich?.[language] ??
                    block.rich?.[language.split("-")[0]] ??
                    block.rich?.[mainLocale] ??
                    block.rich?.[mainLocale.split("-")[0]] ??
                    [],
                }}
                label={t("text")}
                disabled={disabled}
                language={language}
                onChange={(rich) => editBlock({ rich })}
              />
            )}
            {(["hero", "image"] as string[]).includes(block.kind) && (
              <label>
                {e("image")}
                <input
                  value={block.image}
                  type="url"
                  maxLength={2000}
                  onChange={(event) => editBlock({ image: event.target.value })}
                />
              </label>
            )}
            {block.kind === "products" && (
              <>
                <label>
                  {t("products")}
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void onSearch(search);
                      }
                    }}
                  />
                </label>
                <button type="button" onClick={() => void onSearch(search)}>
                  {t("products")} ↗
                </button>
                <label className="designer-check">
                  <input
                    type="checkbox"
                    checked={
                      block.productMode !== "selected" && !block.products.length
                    }
                    onChange={(event) =>
                      editBlock({
                        productMode: event.target.checked ? "all" : "selected",
                        products: event.target.checked
                          ? []
                          : products.map((p) => p.id),
                      })
                    }
                  />
                  {e("allProducts")}
                </label>
                {products.map((p) => (
                  <label className="designer-check" key={p.id}>
                    <input
                      type="checkbox"
                      checked={
                        (block.productMode !== "selected" &&
                          !block.products.length) ||
                        block.products.includes(p.id)
                      }
                      onChange={(event) =>
                        editBlock({
                          productMode: "selected",
                          products: event.target.checked
                            ? [...new Set([...block.products, p.id])]
                            : (block.productMode === "selected" ||
                              block.products.length
                                ? block.products
                                : products.map((p) => p.id)
                              ).filter((id) => id !== p.id),
                        })
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </>
            )}
            {block.kind === "form" && (
              <>
                {block.fields.map((f) => (
                  <div className="designer-form-field" key={f.id}>
                    <LocalizedField
                      label={e("label")}
                      value={f.label}
                      onChange={(label) =>
                        editBlock({
                          fields: block.fields.map((field) =>
                            field.id === f.id
                              ? {
                                  ...field,
                                  label: Object.fromEntries(
                                    Object.entries(label).filter(
                                      (pair): pair is [string, string] =>
                                        typeof pair[1] === "string",
                                    ),
                                  ),
                                }
                              : field,
                          ),
                        })
                      }
                    />
                    <select
                      aria-label={e("field")}
                      value={f.kind}
                      onChange={(event) =>
                        editBlock({
                          fields: block.fields.map((field) =>
                            field.id === f.id
                              ? {
                                  ...field,
                                  kind: event.target.value as FormField["kind"],
                                }
                              : field,
                          ),
                        })
                      }
                    >
                      {(
                        [
                          "text",
                          "email",
                          "textarea",
                          "checkbox",
                          "number",
                        ] as const
                      ).map((k) => (
                        <option value={k} key={k}>
                          {k === "text" ? t("text") : e(k)}
                        </option>
                      ))}
                    </select>
                    <label className="designer-check">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(event) =>
                          editBlock({
                            fields: block.fields.map((field) =>
                              field.id === f.id
                                ? { ...field, required: event.target.checked }
                                : field,
                            ),
                          })
                        }
                      />
                      {e("required")}
                    </label>
                    <button
                      onClick={() =>
                        editBlock({
                          fields: block.fields.filter(
                            (field) => field.id !== f.id,
                          ),
                        })
                      }
                    >
                      {t("remove")}
                    </button>
                  </div>
                ))}
                <button
                  disabled={block.fields.length >= 12}
                  onClick={() =>
                    editBlock({
                      fields: [
                        ...block.fields,
                        {
                          id: `field_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
                          kind: "text",
                          required: false,
                          label: { [mainLocale]: e("label") },
                        },
                      ],
                    })
                  }
                >
                  + {e("field")}
                </button>
              </>
            )}
            <button
              className="designer-remove"
              onClick={() => {
                patch({
                  content: {
                    blocks: page.content.blocks.filter(
                      (b) => b.id !== block.id,
                    ),
                  },
                });
                onSelect("");
              }}
            >
              {t("remove")}
            </button>
          </section>
        )}
      </fieldset>
    </div>
  );
}
