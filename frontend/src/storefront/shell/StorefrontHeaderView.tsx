/** Shared native shop header markup; callers supply authorized commands or a read-only preview. */
import type { ReactNode } from "react";
import { collectionURL } from "../catalog/product-url";
import Icon from "../../shared/ui/Icon";
import { useShopText } from "../../shared/i18n/shop-i18n";
import { useWorkbenchText } from "../../shared/i18n/workbench-i18n";
export default function StorefrontHeaderView({
  displayName,
  company = {},
  children,
  navigation,
  busy = false,
  business = false,
  businessDisabled = false,
  adaptation = false,
  count = 0,
  onBusiness,
  onAccount,
  onMerchant,
  onConsent,
  onBag,
}: {
  displayName: string;
  company?: Record<string, string>;
  children?: ReactNode;
  navigation?: ReactNode;
  busy?: boolean;
  business?: boolean;
  businessDisabled?: boolean;
  adaptation?: boolean;
  count?: number;
  onBusiness?: () => void;
  onAccount?: () => void;
  onMerchant?: () => void;
  onConsent?: () => void;
  onBag?: () => void;
}) {
  const { s } = useShopText(),
    { w } = useWorkbenchText();
  return (
    <header className="shop-nav">
      <a href={collectionURL()} className="shop-brand">
        {company.logoUrl && (
          <img
            src={company.logoUrl}
            alt={displayName}
            className="company-brand-logo"
          />
        )}
        {displayName}
        <span> / </span>
      </a>
      <nav>
        <a href={collectionURL()}>{s("collection")}</a>
        {navigation}
        <button
          disabled={busy || businessDisabled || !onBusiness}
          onClick={onBusiness}
        >
          {business ? s("businessAccount") : s("business")}
        </button>
        <button disabled={!onAccount} onClick={onAccount}>
          {w("account")}
        </button>
        <button disabled={!onMerchant} onClick={onMerchant}>
          {s("studio")} ↗
        </button>
      </nav>
      {children}
      <button
        className="shop-text-button"
        aria-pressed={adaptation}
        disabled={!onConsent}
        onClick={onConsent}
      >
        {w(adaptation ? "adaptationOn" : "adaptationOff")}
      </button>
      <button
        className="shop-bag-button"
        disabled={busy || !onBag}
        onClick={onBag}
      >
        <Icon name="box" size={18} />
        {s("bag")} <b>{count}</b>
      </button>
    </header>
  );
}
