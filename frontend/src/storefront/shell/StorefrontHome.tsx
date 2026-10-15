/** Native home composition; previews reuse the same presentational hero and catalogue cards. */
import CollectionView from "./CollectionView";
import ConciergeView from "./ConciergeView";
import HomeHero from "./HomeHero";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import { useStorefront } from "./StorefrontContext";
export default function StorefrontHome() {
  const { salesChannel, experience, products } = useStorefront();
  return (
    <main className="shop-content">
      <AppSurfaceSlot location="storefront.home" context={{ salesChannel }} />
      <HomeHero products={products} experience={experience} />
      <ConciergeView />
      <CollectionView />
    </main>
  );
}
