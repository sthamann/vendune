/** StorefrontHeader: storefront view composed from the scoped cart/controller. */
import { openConsent } from "../../shared/legal/consent-store";
import { shopApi, type Cart } from "../../shared/api/shop-api";
import { StorefrontAppNavigation } from "../../shared/apps/AppSurfaces";
import StorefrontHeaderView from "./StorefrontHeaderView";
import StorefrontCurrency from "./StorefrontCurrency";
import "../../shared/styles/currencies.css";
import StorefrontLanguage from "./StorefrontLanguage";
import "../../shared/styles/apps.css";
import "../../shared/styles/workbench.css";
import "../styles/shop.css";

import { useStorefront } from "./StorefrontContext";
export default function StorefrontHeader() {
  const {
    company,
    s,
    busy,
    cart,
    run,
    save,
    setAccount,
    onMerchant,
    adaptation,
    shopTenant,
    products,
    openBag,
  } = useStorefront();
  const displayName =
    company.brandName ||
    company.name ||
    (shopTenant === "nord-atelier" &&
    products.some((p) => p.media[0]?.url.startsWith("/media/demo/fashion/"))
      ? s("fashionBrand")
      : shopTenant);
  return (
    <StorefrontHeaderView
      displayName={displayName}
      company={company}
      busy={busy}
      business={cart?.customerGroup === "business"}
      businessDisabled={!cart}
      adaptation={adaptation}
      count={
        cart?.status === "completed"
          ? 0
          : (cart?.lineItems.reduce((n, i) => n + i.quantity, 0) ?? 0)
      }
      navigation={<StorefrontAppNavigation />}
      onAccount={() => setAccount(true)}
      onMerchant={onMerchant}
      onConsent={openConsent}
      onBag={openBag}
      onBusiness={() =>
        void run(async () => {
          if (!cart || cart.customerGroup === "business") return;
          save(
            await shopApi<Cart>(
              "/store-api/account/login",
              { email: "buyer@example.test", password: "demo-business" },
              cart.token,
            ),
          );
        })
      }
    >
      <StorefrontLanguage />
      <StorefrontCurrency />
    </StorefrontHeaderView>
  );
}
