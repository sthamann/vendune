/** Guided company creation is one atomic native API command; the main-language name is always visible. */
import { useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../shared/i18n/ContentLanguagePicker";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { contentText } from "../../shared/i18n/content-language";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
import { useB2BExperienceText } from "./experience-i18n";
import CustomerPicker from "./CustomerPicker";
import { organizationReference } from "./reference";
export default function CompanyCreate({
  request,
  locales,
  mainLocale,
  canLink,
  onCancel,
  onCreated,
}: {
  request: RequestFn;
  locales: string[];
  mainLocale: string;
  canLink: boolean;
  onCancel: () => void;
  onCreated: (id: string) => Promise<void>;
}) {
  const t = useB2BText(),
    x = useB2BExperienceText();
  const [id] = useState(organizationReference),
    [name, setName] = useState<Record<string, string>>({}),
    [vat, setVat] = useState(""),
    [customer, setCustomer] = useState(""),
    [language, setLanguage] = useState(mainLocale),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [created, setCreated] = useState(false);
  const save = async () => {
    if (!contentText(name, mainLocale, mainLocale).trim()) {
      setLanguage(mainLocale);
      setError(t("name"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (!created) {
        await request("/api/b2b/company.create", {
          id,
          revision: 0,
          data: { name, active: true, vatId: vat },
          ...(customer ? { customerId: customer } : {}),
        });
        setCreated(true);
      }
      await onCreated(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmDialog
      title={t("newCompany")}
      confirmLabel={t("newCompany")}
      disabled={busy}
      onCancel={onCancel}
      onConfirm={() => void save()}
    >
      <ContentLanguage
        locales={locales}
        mainLocale={mainLocale}
        language={language}
        onLanguageChange={setLanguage}
      >
        <p>{x("createHint")}</p>
        <ContentLanguagePicker />
        <fieldset className="b2b-fields" disabled={busy}>
          <LocalizedField
            label={t("name")}
            value={name}
            required
            maxLength={100}
            error={
              error && !contentText(name, mainLocale, mainLocale).trim()
                ? error
                : undefined
            }
            onChange={(n) => setName(n as Record<string, string>)}
          />
          <label>
            {t("vat")}
            <input value={vat} onChange={(e) => setVat(e.target.value)} />
          </label>
          {canLink && (
            <CustomerPicker
              request={request}
              value={customer}
              onChange={setCustomer}
            />
          )}
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </ContentLanguage>
    </ConfirmDialog>
  );
}
