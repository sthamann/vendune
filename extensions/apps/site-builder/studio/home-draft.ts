/** Convert the native home to an unsaved app document; retain real locale text and owned product-media selection. */
import { shopText } from "../../../../frontend/src/shared/i18n/shop-i18n";
import type { SiteProduct } from "../Renderer";
import { newPage, newBlock } from "../model";
import type { HomeSnapshot } from "./StorefrontCanvas";
export function homeDraft(
  channel: string,
  mainLocale: string,
  language: string,
  products: SiteProduct[],
  snapshot: HomeSnapshot,
) {
  const base = shopText(mainLocale),
    fashion = products.some((p) =>
      p.media[0]?.url.startsWith("/media/demo/fashion/"),
    );
  const page = newPage(channel, mainLocale, base("collection"));
  page.slug = "home";
  page.status = "published";
  const hero = page.content.blocks[0];
  hero.text = {
    [mainLocale]: base(fashion ? "fashionHero" : "hero"),
    [language]: snapshot.title || base(fashion ? "fashionHero" : "hero"),
  };
  hero.rich = {
    [mainLocale]: [
      { type: "paragraph", text: base(fashion ? "fashionIntro" : "intro") },
    ],
  };
  if (snapshot.description)
    hero.rich[language] = [{ type: "paragraph", text: snapshot.description }];
  const product = products.find((p) =>
    p.media.some((m) => m.url === snapshot.image),
  );
  if (product) {
    hero.productMode = "selected";
    hero.products = [product.id];
  } else if (
    snapshot.image.startsWith("https://") ||
    snapshot.image.startsWith("/store-api/")
  )
    hero.image = snapshot.image;
  const collection = newBlock("products", mainLocale, base("collection"));
  collection.text[language] =
    snapshot.collection || shopText(language)("collection");
  page.title[language] =
    snapshot.collection || shopText(language)("collection");
  page.content.blocks.push(collection);
  return page;
}
