/** Shared shop text hook; dictionaries live in focused locale files. */
import { useLocale } from "./i18n";
import { de } from "./locales/shop-de";
import { en } from "./locales/shop-en";
import { fr } from "./locales/shop-fr";
import { es } from "./locales/shop-es";
import type { Key } from "./locales/shop-de";
export function shopText(locale: string) {
  const dict =
    locale === "de-DE"
      ? de
      : locale === "fr-FR"
        ? fr
        : locale === "es-ES"
          ? es
          : en;
  return (key: string) => dict[key as Key] ?? key;
}
export function useShopText() {
  const context = useLocale();
  return { ...context, s: shopText(context.locale) };
}
