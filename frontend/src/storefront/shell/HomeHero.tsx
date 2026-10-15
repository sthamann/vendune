/** Shared native home hero for the storefront and visual preview; no commerce commands. */
import { BRAND } from "../../shared/ui/Brand";
import Icon from "../../shared/ui/Icon";
import Art from "../../shared/ui/ProductArt";
import { useShopText } from "../../shared/i18n/shop-i18n";
import { useWorkbenchText } from "../../shared/i18n/workbench-i18n";
import { useExperienceUIText } from "../../shared/i18n/experience-ui-i18n";
import type { Product } from "../../shared/api/shop-api";
export default function HomeHero({
  products,
  experience,
}: {
  products: Pick<Product, "id" | "name" | "media">[];
  experience?: { headline?: string };
}) {
  const { s } = useShopText(),
    { w } = useWorkbenchText(),
    { u } = useExperienceUIText();
  const fashion = products.some((p) =>
    p.media[0]?.url.startsWith("/media/demo/fashion/"),
  );
  const hero =
    products.find((p) => p.id === (fashion ? "coat" : "chair")) ?? products[0];
  return (
    <section className="shop-hero">
      <div>
        <p className="shop-kicker">
          {fashion ? s("fashionBrand") : BRAND.name} /{" "}
          {fashion ? s("fashionCollection") : w("consideredObjects")}
        </p>
        <h1>
          {experience?.headline &&
          experience.headline !== "Objects for a more considered everyday." &&
          experience.headline !== "A considered wardrobe. Made for everyday."
            ? experience.headline
            : s(fashion ? "fashionHero" : "hero")}
        </h1>
        <p>{s(fashion ? "fashionIntro" : "intro")}</p>
        <div className="shop-hero-actions">
          <a className="shop-primary" href="#collection">
            {s("explore")}
            <Icon name="arrow" />
          </a>
          <a className="shop-assistant-link" href="#assistant">
            <Icon name="spark" size={18} />
            {u("copilot")}
          </a>
        </div>
      </div>
      <div className="shop-hero-art">
        {hero?.media[0]?.url ? (
          <img
            className="shop-hero-photo"
            src={hero.media[0].url}
            alt={hero.name}
            width={1000}
            height={1000}
            fetchPriority="high"
          />
        ) : hero ? (
          <Art id={hero.id} />
        ) : null}
        <span>01 / {hero?.name ?? s("collection")}</span>
      </div>
    </section>
  );
}
