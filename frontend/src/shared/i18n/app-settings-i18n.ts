/** App setting declarations contain labels and types only; values belong to the encrypted server store. */
import { useLocale } from "./i18n";
export const appSettingWords = {
  settings: [
    "App settings",
    "App-Einstellungen",
    "Paramètres de l’app",
    "Ajustes de la app",
  ],
  hint: [
    "Declare what merchants configure after installation. Never enter passwords or API keys in the app definition. Installed values stay encrypted on the server; secret fields are never returned.",
    "Definiere, was Händler nach der Installation konfigurieren. Trage hier keine Passwörter oder API-Schlüssel ein. Installierte Werte bleiben verschlüsselt auf dem Server; Geheimnisse werden nie zurückgegeben.",
    "Déclare les paramètres après installation. Ne saisis aucun secret ici. Les valeurs restent chiffrées et les secrets ne sont jamais retournés.",
    "Define ajustes posteriores a la instalación. No introduzcas secretos aquí. Los valores quedan cifrados y los secretos nunca se devuelven.",
  ],
  add: [
    "Add setting",
    "Einstellung hinzufügen",
    "Ajouter un paramètre",
    "Añadir ajuste",
  ],
  key: ["Setting ID", "Einstellungs-ID", "ID du paramètre", "ID del ajuste"],
  label: ["Label", "Bezeichnung", "Libellé", "Etiqueta"],
  string: ["Text", "Text", "Texte", "Texto"],
  secret: [
    "Secret / credential",
    "Geheimnis / Zugangsdaten",
    "Secret / identifiant",
    "Secreto / credencial",
  ],
  boolean: ["Switch", "Schalter", "Interrupteur", "Interruptor"],
  integer: ["Whole number", "Ganze Zahl", "Nombre entier", "Número entero"],
  required: ["Required", "Pflichtfeld", "Obligatoire", "Obligatorio"],
  save: [
    "Save app settings",
    "App-Einstellungen speichern",
    "Enregistrer les paramètres",
    "Guardar ajustes",
  ],
  configured: [
    "Configured · leave blank to keep",
    "Konfiguriert · leer lassen zum Beibehalten",
    "Configuré · laisser vide pour conserver",
    "Configurado · dejar vacío para conservar",
  ],
  saved: [
    "Settings saved",
    "Einstellungen gespeichert",
    "Paramètres enregistrés",
    "Ajustes guardados",
  ],
  stale: [
    "The package changed. Review and enter settings again for the new version.",
    "Das Paket wurde geändert. Prüfe die Einstellungen und gib sie für die neue Version erneut ein.",
    "Le paquet a changé. Vérifie et saisis à nouveau les paramètres.",
    "El paquete cambió. Revisa y vuelve a introducir los ajustes.",
  ],
  approve: [
    "Use these values with this installed app version",
    "Diese Werte für diese installierte App-Version freigeben",
    "Autoriser ces valeurs pour cette version",
    "Autorizar estos valores para esta versión",
  ],
  runtime: [
    "Private service actions receive these settings server-side. Native apps can manage values here; secret values are not available to native browser views or agent tasks. Credentials are live-only and are not copied or restored by sandbox publication.",
    "Private Serviceaktionen erhalten diese Einstellungen serverseitig. Native Apps können Werte hier verwalten; Geheimnisse sind für Browseransichten und Agentenaufgaben nicht verfügbar. Zugangsdaten gelten nur live und werden beim Veröffentlichen einer Sandbox weder kopiert noch zurückgesetzt.",
    "Les actions de service privées reçoivent les paramètres côté serveur. Les secrets ne sont pas disponibles aux vues natives ou agents. Les identifiants restent en production sans copie ni restauration par sandbox.",
    "Las acciones privadas reciben ajustes en el servidor. Los secretos no están disponibles en vistas nativas ni agentes. Las credenciales son exclusivas de producción, sin copia ni restauración por sandbox.",
  ],
} as const;
export function useAppSettingText() {
  const { locale } = useLocale();
  return (k: keyof typeof appSettingWords) =>
    appSettingWords[k][
      { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]
    ];
}
