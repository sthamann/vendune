/** Account-security vocabulary is shared by merchant and operator authentication. */
import { useLocale } from "./i18n";
const words = {
  recover: [
    "Forgot your password?",
    "Passwort vergessen?",
    "Mot de passe oublié ?",
    "¿Olvidaste tu contraseña?",
  ],
  title: [
    "Account security",
    "Kontosicherheit",
    "Sécurité du compte",
    "Seguridad de la cuenta",
  ],
  hint: [
    "Protect your personal account with an authenticator. Security is personal and is never copied to a sandbox.",
    "Schütze dein persönliches Konto mit einer Authenticator-App. Sicherheit ist persönlich und wird niemals in eine Sandbox kopiert.",
    "Protège ton compte avec une application d’authentification. La sécurité personnelle n’est jamais copiée en sandbox.",
    "Protege tu cuenta con un autenticador. La seguridad personal nunca se copia a una sandbox.",
  ],
  enabled: [
    "Two-factor authentication enabled",
    "Zwei-Faktor-Anmeldung aktiviert",
    "Authentification à deux facteurs activée",
    "Autenticación de dos factores activada",
  ],
  disabled: [
    "Two-factor authentication not enabled",
    "Zwei-Faktor-Anmeldung nicht aktiviert",
    "Authentification à deux facteurs désactivée",
    "Autenticación de dos factores desactivada",
  ],
  password: [
    "Current password",
    "Aktuelles Passwort",
    "Mot de passe actuel",
    "Contraseña actual",
  ],
  code: [
    "Authenticator or recovery code",
    "Authenticator- oder Wiederherstellungscode",
    "Code d’authentification ou de récupération",
    "Código de autenticación o recuperación",
  ],
  challenge: [
    "Confirm it is you",
    "Bestätige deine Identität",
    "Confirme ton identité",
    "Confirma tu identidad",
  ],
  challengeHint: [
    "Enter a current authenticator code or an unused recovery code. The sign-in expires after five minutes.",
    "Gib einen aktuellen Authenticator-Code oder einen unbenutzten Wiederherstellungscode ein. Die Anmeldung läuft nach fünf Minuten ab.",
    "Saisis un code actuel ou un code de récupération inutilisé. La connexion expire après cinq minutes.",
    "Introduce un código actual o de recuperación sin usar. El inicio caduca tras cinco minutos.",
  ],
  verify: [
    "Verify and sign in",
    "Prüfen und anmelden",
    "Vérifier et se connecter",
    "Verificar e iniciar sesión",
  ],
  enroll: [
    "Set up authenticator",
    "Authenticator einrichten",
    "Configurer un authentificateur",
    "Configurar autenticador",
  ],
  setupHint: [
    "Add this key to your authenticator as Veyndo, using six digits and a 30-second interval. Then enter its code to activate protection.",
    "Füge diesen Schlüssel als Veyndo mit sechs Ziffern und 30 Sekunden Intervall zu deinem Authenticator hinzu. Gib danach seinen Code ein, um den Schutz zu aktivieren.",
    "Ajoute cette clé comme Veyndo, avec six chiffres et un intervalle de 30 secondes. Saisis ensuite son code pour activer la protection.",
    "Añade esta clave como Veyndo, con seis dígitos y un intervalo de 30 segundos. Introduce su código para activar la protección.",
  ],
  secret: [
    "Setup key",
    "Einrichtungsschlüssel",
    "Clé de configuration",
    "Clave de configuración",
  ],
  confirm: [
    "Activate protection",
    "Schutz aktivieren",
    "Activer la protection",
    "Activar protección",
  ],
  disable: [
    "Disable protection",
    "Schutz deaktivieren",
    "Désactiver la protection",
    "Desactivar protección",
  ],
  recovery: [
    "Save these recovery codes privately. Each works once. All previous sessions have been signed out.",
    "Bewahre diese Wiederherstellungscodes privat auf. Jeder funktioniert einmal. Alle bisherigen Sitzungen wurden abgemeldet.",
    "Conserve ces codes en privé. Chacun fonctionne une seule fois. Les anciennes sessions sont déconnectées.",
    "Guarda estos códigos en privado. Cada uno funciona una vez. Las sesiones anteriores se han cerrado.",
  ],
  finish: [
    "Codes saved — return to sign-in",
    "Codes gesichert – zurück zur Anmeldung",
    "Codes sauvegardés — retourner à la connexion",
    "Códigos guardados — volver al inicio",
  ],
  cancel: [
    "Back to sign-in",
    "Zurück zur Anmeldung",
    "Retour à la connexion",
    "Volver al inicio",
  ],
  remaining: [
    "Unused recovery codes",
    "Unbenutzte Wiederherstellungscodes",
    "Codes de récupération inutilisés",
    "Códigos de recuperación sin usar",
  ],
  retry: [
    "Account security could not be updated. Reload and check your password and code.",
    "Die Kontosicherheit konnte nicht aktualisiert werden. Lade neu und prüfe Passwort und Code.",
    "La sécurité n’a pas pu être modifiée. Recharge et vérifie mot de passe et code.",
    "No se pudo actualizar la seguridad. Recarga y comprueba contraseña y código.",
  ],
} as const;
export function useSecurityText() {
  const { locale } = useLocale();
  const index =
    locale === "de-DE"
      ? 1
      : locale === "fr-FR"
        ? 2
        : locale === "es-ES"
          ? 3
          : 0;
  return (key: keyof typeof words) => words[key][index];
}
