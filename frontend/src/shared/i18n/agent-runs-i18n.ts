/** Durable run states and explicit ambiguous-call continuation, in the shared interface language. */
import { useLocale } from "./i18n";
export const agentRunWords = {
  authority: [
    "Access changed. Sign in with the original account and check its permissions before continuing.",
    "Der Zugriff hat sich geändert. Melde dich mit dem ursprünglichen Konto an und prüfe dessen Rechte vor der Fortsetzung.",
    "L’accès a changé. Reconnectez le compte initial et vérifiez ses droits avant de continuer.",
    "El acceso ha cambiado. Inicia sesión con la cuenta original y revisa sus permisos antes de continuar.",
  ],
  capacity: [
    "The model capacity is busy. Your saved progress is kept; continue when capacity is available.",
    "Die Modellkapazität ist ausgelastet. Dein Fortschritt bleibt gespeichert; setze den Auftrag später fort.",
    "La capacité du modèle est occupée. La progression est conservée ; reprenez plus tard.",
    "La capacidad del modelo está ocupada. El progreso se conserva; continúa más tarde.",
  ],
  queued: [
    "Saved · waiting for a worker",
    "Gespeichert · wartet auf einen Worker",
    "Enregistré · en attente",
    "Guardado · esperando un proceso",
  ],
  running: [
    "Working · progress is saved",
    "In Arbeit · Fortschritt wird gespeichert",
    "En cours · progression enregistrée",
    "En curso · progreso guardado",
  ],
  ready: [
    "Proposal ready for review",
    "Vorschlag bereit zur Prüfung",
    "Proposition prête à examiner",
    "Propuesta lista para revisar",
  ],
  failed: [
    "Stopped · completed steps are saved",
    "Angehalten · abgeschlossene Schritte sind gespeichert",
    "Arrêté · étapes terminées conservées",
    "Detenido · pasos completados guardados",
  ],
  uncertain: [
    "Interrupted model call · review before continuing",
    "Modellaufruf unterbrochen · vor Fortsetzung prüfen",
    "Appel du modèle interrompu · vérifier avant de continuer",
    "Llamada al modelo interrumpida · revisar antes de continuar",
  ],
  cancelled: [
    "Run cancelled",
    "Auftrag abgebrochen",
    "Exécution annulée",
    "Ejecución cancelada",
  ],
  hint: [
    "You can leave this page. A proposal never changes your shop without approval.",
    "Du kannst diese Seite verlassen. Ein Vorschlag ändert deinen Shop erst nach Freigabe.",
    "Vous pouvez quitter cette page. Une proposition ne modifie la boutique qu’après validation.",
    "Puedes salir de esta página. Una propuesta solo modifica la tienda tras su aprobación.",
  ],
  ambiguous: [
    "The last model call may already have been processed or charged. Continuing explicitly allows that unfinished call again; saved results are reused.",
    "Der letzte Modellaufruf könnte bereits verarbeitet oder berechnet worden sein. Mit der Fortsetzung erlaubst du diesen unvollständigen Aufruf erneut; gespeicherte Ergebnisse werden wiederverwendet.",
    "Le dernier appel peut avoir été traité ou facturé. Continuer autorise explicitement cet appel inachevé ; les résultats enregistrés sont réutilisés.",
    "La última llamada podría haberse procesado o cobrado. Continuar permite repetir esa llamada incompleta; se reutilizan los resultados guardados.",
  ],
  resume: [
    "Continue saved run",
    "Gespeicherten Auftrag fortsetzen",
    "Reprendre l’exécution",
    "Continuar ejecución guardada",
  ],
  cancel: [
    "Cancel run",
    "Auftrag abbrechen",
    "Annuler l’exécution",
    "Cancelar ejecución",
  ],
  steps: [
    "Completed model steps: {count}",
    "Abgeschlossene Modellschritte: {count}",
    "Étapes du modèle terminées : {count}",
    "Pasos del modelo completados: {count}",
  ],
  loadError: [
    "The saved progress could not be loaded. Reopen the conversation to try again.",
    "Der gespeicherte Fortschritt konnte nicht geladen werden. Öffne das Gespräch erneut.",
    "La progression n’a pas pu être chargée. Rouvrez la conversation.",
    "No se pudo cargar el progreso. Vuelve a abrir la conversación.",
  ],
} as const;
export function useAgentRunText() {
  const { locale } = useLocale();
  const index =
    locale === "de-DE"
      ? 1
      : locale === "fr-FR"
        ? 2
        : locale === "es-ES"
          ? 3
          : 0;
  return (key: keyof typeof agentRunWords) => agentRunWords[key][index];
}
