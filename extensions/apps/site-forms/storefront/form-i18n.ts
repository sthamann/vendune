/** Public form interface labels; declared field labels remain editable shop-language content. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  responses: [
    "Form responses",
    "Formularantworten",
    "Réponses au formulaire",
    "Respuestas del formulario",
  ],
  privateInbox: [
    "Private responses · current page · latest 20 entries",
    "Private Antworten · aktuelle Seite · letzte 20 Einträge",
    "Réponses privées · page actuelle · 20 dernières entrées",
    "Respuestas privadas · página actual · últimas 20 entradas",
  ],
  emptyInbox: [
    "No responses yet.",
    "Noch keine Antworten.",
    "Aucune réponse.",
    "Aún no hay respuestas.",
  ],
  yes: ["Yes", "Ja", "Oui", "Sí"],
  no: ["No", "Nein", "Non", "No"],
  privacy: [
    "I have read the privacy information.",
    "Ich habe die Datenschutzhinweise gelesen.",
    "J’ai lu les informations de confidentialité.",
    "He leído la información de privacidad.",
  ],
  submit: [
    "Send request",
    "Anfrage senden",
    "Envoyer la demande",
    "Enviar solicitud",
  ],
  accepted: [
    "Thank you. Your request has been received.",
    "Danke. Deine Anfrage ist angekommen.",
    "Merci. Votre demande a été reçue.",
    "Gracias. Hemos recibido tu solicitud.",
  ],
  unavailable: [
    "The request could not be sent. Please check your entries and try again.",
    "Die Anfrage konnte nicht gesendet werden. Prüfe deine Eingaben und versuche es erneut.",
    "La demande n’a pas pu être envoyée. Vérifiez les champs et réessayez.",
    "No se pudo enviar. Revisa los datos e inténtalo de nuevo.",
  ],
} as const;
export function useFormText() {
  const { locale } = useLocale();
  const i =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (key: keyof typeof words) => words[key][i];
}
