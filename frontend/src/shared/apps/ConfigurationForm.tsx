/** Shared product configuration form: declared input fields use the existing cart, revision and app gateway. */
import { useState } from "react";
import { shopApi, type Cart } from "../api/shop-api";
import { useAppText } from "../i18n/app-i18n";
import { contentText } from "../i18n/content-language";
import type { Props, Slot } from "./AppSlot";
import ConfigurationFields from "./ConfigurationFields";
export default function ConfigurationForm({
  slot,
  productId,
  cart,
  onCart,
  language,
  mainLocale,
}: Props & { slot: Slot; language: string; mainLocale: string }) {
  const { a } = useAppText();
  const stored = cart?.lineItems
    ?.find((line) => line.id === productId)
    ?.appConfigurations?.find((config) => config.app === slot.app)?.fields;
  const [text, setText] = useState(() =>
    String(stored?.[slot.configuration!.inputField] ?? ""),
  );
  const [fields, setFields] = useState<Record<string, unknown>>(
    () =>
      stored ??
      Object.fromEntries(
        (slot.configuration?.inputs?.fields ?? [])
          .filter((field) => field.kind === "boolean")
          .map((field) => [field.name, false]),
      ),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const c = slot.configuration!;
  const label = contentText(c.label, language, mainLocale) || slot.app;
  const hint = contentText(c.hint, language, mainLocale);
  return (
    <section className="app-slot">
      <h3>{label}</h3>
      {hint && <p>{hint}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!cart) return;
          setBusy(true);
          setError("");
          try {
            onCart(
              await shopApi<Cart>(
                `/store-api/apps/${slot.app}/configure`,
                {
                  productId,
                  fields: c.inputs ? fields : { [c.inputField]: text },
                  revision: cart.revision,
                },
                cart.token,
              ),
            );
            setSaved(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset
          className="configuration-controls"
          disabled={busy}
          aria-label={label}
        >
          {c.inputs ? (
            <ConfigurationFields
              slot={slot}
              fields={fields}
              language={language}
              mainLocale={mainLocale}
              onChange={(value) => {
                setFields(value);
                setSaved(false);
              }}
              onError={setError}
            />
          ) : (
            <label>
              {label}
              <input
                value={text}
                maxLength={2000}
                required
                onChange={(e) => {
                  setText(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
          )}
        </fieldset>
        <button
          className="shop-secondary"
          disabled={!cart || busy || (!c.inputs && !text)}
        >
          {a("save")}
        </button>
      </form>
      {saved && <p role="status">{a("configurationSaved")}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
