/** Single visible field for the editor's language, with main-language preview and explicit restore-to-inheritance. */
import "./content-editors.css";
import { useId } from "react";
import { useContentLanguage } from "./ContentLanguage";
import { useInternationalText } from "./international-i18n";
import {
  contentKey,
  contentText,
  type LocalizedText,
} from "./content-language";
export default function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  required = false,
  error,
  disabled = false,
  externalFallback,
  externalLabel,
  placeholder,
}: {
  disabled?: boolean;
  label: string;
  value: LocalizedText;
  onChange: (map: LocalizedText) => void;
  multiline?: boolean;
  maxLength?: number;
  required?: boolean;
  error?: string;
  externalFallback?: string;
  externalLabel?: string;
  placeholder?: string;
}) {
  const id = useId(),
    { language, locales, mainLocale } = useContentLanguage(),
    { i, locale } = useInternationalText();
  const key = contentKey(value, language, locales),
    main = language === mainLocale;
  const inherited =
    (!main || externalFallback !== undefined) && value[key] == null;
  const fallback =
    externalFallback ?? contentText(value, mainLocale, mainLocale);
  const set = (text: string) => onChange({ ...value, [key]: text });
  const props = {
    id,
    disabled,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
    value: value[key] ?? "",
    placeholder: inherited ? fallback || placeholder : placeholder,
    maxLength,
    required: required && main && externalFallback === undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(e.target.value),
  };
  return (
    <div className={`intl-translated-field ${error ? "field-invalid" : ""}`}>
      <div className="intl-field-heading">
        <label htmlFor={id}>{label}</label>
        {(!main || externalFallback !== undefined) && (
          <button
            type="button"
            disabled={disabled}
            className="intl-inherit"
            aria-pressed={inherited}
            onClick={() => {
              if (inherited) set(fallback);
              else {
                const next = { ...value };
                delete next[key];
                const base = language.split("-")[0];
                if (
                  locales.filter((l) => l !== base && l.split("-")[0] === base)
                    .length <= 1
                ) {
                  delete next[base];
                  delete next[language];
                }
                onChange(next);
              }
            }}
          >
            {inherited && externalLabel
              ? externalLabel
              : i(inherited ? "inheritedFrom" : "customText")}
            {inherited && !externalLabel
              ? ` ${new Intl.DisplayNames([locale], { type: "language" }).of(mainLocale) ?? mainLocale}`
              : ""}{" "}
            ↗
          </button>
        )}
      </div>
      {multiline ? <textarea {...props} rows={3} /> : <input {...props} />}
      {error && (
        <small id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
