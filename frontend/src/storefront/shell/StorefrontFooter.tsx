/** Shared native legal footer; preview containers prevent navigation and submission. */
import { openConsent } from "../../shared/legal/consent-store";
import { useLegalText } from "../../shared/i18n/legal-i18n";
import { useCompanyText } from "../../shared/i18n/company-i18n";
import { useShopText } from "../../shared/i18n/shop-i18n";
export default function StorefrontFooter({ name }: { name: string }) {
  const { co } = useCompanyText(),
    { l } = useLegalText(),
    { s } = useShopText();
  return (
    <footer className="shop-footer">
      <strong>{name} /</strong>
      <a href="#legal">{co("legalPage")}</a>
      <a href="#legal/privacy">{l("privacy")}</a>
      <a href="#legal/terms">{l("terms")}</a>
      <a href="#legal/accessibility">{l("accessibility")}</a>
      <a href="#withdrawal">{l("withdrawHere")}</a>
      <a href="#privacy-rights">{l("rights")}</a>
      <button onClick={openConsent}>{l("consent")}</button>
      <p>{s("simulation")}</p>
      <a href="https://github.com/sthamann/veyndo">GitHub ↗</a>
    </footer>
  );
}
