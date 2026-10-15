/** Public forms send only append-only, schema-validated requests to the native app inbox. */
import { useState } from "react";
import type { PublicFormProps } from "../../../../frontend/src/shared/apps/form-contract";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";

import { useFormText } from "./form-i18n";
import "./forms.css";
export default function PublishedForm({
  block,
  page,
  channel,
  language,
  mainLocale,
  request,
  preview = false,
}: PublicFormProps) {
  const t = useFormText(),
    [answers, setAnswers] = useState<Record<string, string | number | boolean>>(
      {},
    ),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState("");
  if (accepted)
    return (
      <p className="site-form-success" role="status">
        {t("accepted")}
      </p>
    );
  return (
    <form
      className="site-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (preview || busy || !consent) return;
        setBusy(true);
        setError("");
        try {
          await request("/store-api/apps/site_forms/actions/submit", {
            fields: { page, block: block.id, channel, answers, consent },
          });
          setAccepted(true);
        } catch {
          setError(t("unavailable"));
        } finally {
          setBusy(false);
        }
      }}
    >
      {block.fields.map((f) => (
        <label key={f.id} className={f.kind === "checkbox" ? "site-check" : ""}>
          <span>
            {contentText(f.label, language, mainLocale)}
            {f.required ? " *" : ""}
          </span>
          {f.kind === "textarea" ? (
            <textarea
              required={f.required}
              maxLength={2000}
              value={String(answers[f.id] ?? "")}
              onChange={(e) =>
                setAnswers({ ...answers, [f.id]: e.target.value })
              }
            />
          ) : (
            <input
              required={f.required}
              type={f.kind === "text" ? "text" : f.kind}
              maxLength={f.kind === "email" ? 254 : 2000}
              checked={
                f.kind === "checkbox" ? answers[f.id] === true : undefined
              }
              value={
                f.kind === "checkbox" ? undefined : String(answers[f.id] ?? "")
              }
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [f.id]:
                    f.kind === "checkbox"
                      ? e.target.checked
                      : f.kind === "number" && e.target.value !== ""
                        ? Number(e.target.value)
                        : e.target.value,
                })
              }
            />
          )}
        </label>
      ))}
      <label className="site-check">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          {t("privacy")} <a href="#legal/privacy">↗</a>
        </span>
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy || preview || !consent} type="submit">
        {t("submit")}
      </button>
    </form>
  );
}
