/** One app-owned document contract for manual editing, agents, API/MCP and the storefront renderer. */
import type { LocalizedText } from "../../../frontend/src/shared/i18n/content-language";
import type { RichBlock } from "../../../frontend/src/shared/content/RichDescription";
import type { FormField } from "../../../frontend/src/shared/apps/form-contract";
export type { FormField };
export type BlockKind =
  "hero" | "text" | "products" | "image" | "form" | "articles";
export type Block = {
  id: string;
  kind: BlockKind;
  text: LocalizedText;
  rich: Record<string, RichBlock[]> | null;
  image: string;
  products: string[];
  productMode?: "all" | "selected";
  fields: FormField[];
};
export type Theme = {
  accent?: string | null;
  background?: string | null;
  foreground?: string | null;
  font?: "sans" | "serif" | "mono" | null;
  radius?: number | null;
  spacing?: number | null;
  columns?: number | null;
};
export type PageFields = {
  channel: string;
  slug: string;
  title: LocalizedText;
  kind: "page" | "landing" | "blog" | "article" | "form";
  status: "draft" | "published" | "archived";
  starts_at: string | null;
  content: { blocks: Block[] };
  theme: Theme;
  seo: { description?: LocalizedText } | null;
  author: string | null;
  category: string | null;
};
export type Page = PageFields & { id: string; revision: number };
export const fonts = {
  sans: "Inter, system-ui, sans-serif",
  serif: "Georgia, serif",
  mono: "ui-monospace, monospace",
};
export const defaultTheme: Required<Theme> = {
  accent: "#0877e8",
  background: "#ffffff",
  foreground: "#14283d",
  font: "sans",
  radius: 18,
  spacing: 40,
  columns: 3,
};
export const appPath = "/api/apps/site_builder/actions/";
export function newBlock(
  kind: BlockKind,
  language: string,
  label: string,
): Block {
  return {
    id: `block_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    kind,
    text: { [language]: label },
    rich: null,
    image: "",
    products: [],
    productMode: "all",
    fields: [],
  };
}
export function newPage(
  channel: string,
  language: string,
  title: string,
  kind: PageFields["kind"] = "page",
): Page {
  return {
    id: `page_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    revision: 0,
    channel,
    slug: `page-${crypto.randomUUID().slice(0, 8)}`,
    title: { [language]: title },
    kind,
    status: "draft",
    starts_at: null,
    content: {
      blocks: [
        newBlock(
          kind === "blog" ? "articles" : kind === "form" ? "form" : "hero",
          language,
          title,
        ),
      ],
    },
    theme: {},
    seo: null,
    author: null,
    category: null,
  };
}
export function pageFields(page: Page): PageFields {
  const { id: _id, revision: _revision, ...fields } = page;
  return fields;
}
export function inheritedTheme(pages: Page[], channel: string): Theme {
  const global = pages.find((p) => p.channel === "*" && p.slug === "home");
  const local = pages.find((p) => p.channel === channel && p.slug === "home");
  return {
    ...defaultTheme,
    ...explicitTheme(global?.theme),
    ...explicitTheme(local?.theme),
  };
}
export function effectivePages(pages: Page[], channel: string): Page[] {
  const map = new Map<string, Page>();
  pages.filter((p) => p.channel === "*").forEach((p) => map.set(p.slug, p));
  pages.filter((p) => p.channel === channel).forEach((p) => map.set(p.slug, p));
  return [...map.values()];
}
export function moveBlock(blocks: Block[], from: number, to: number): Block[] {
  const next = [...blocks];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length)
    return next;
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/** Null means inherit rather than an invalid CSS token. */
export function explicitTheme(theme?: Theme): Theme {
  return Object.fromEntries(
    Object.entries(theme ?? {}).filter(([, value]) => value != null),
  );
}

/** Normalize optional component fields from API/agent documents at the app boundary. */
export function normalizePage(page: Page): Page {
  return {
    ...page,
    content: {
      blocks: page.content.blocks.map((b) => ({
        ...b,
        text: b.text ?? {},
        rich: b.rich ?? null,
        image: b.image ?? "",
        products: b.products ?? [],
        fields: b.fields ?? [],
      })),
    },
  };
}
