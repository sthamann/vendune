/** Personal workspace vocabulary; UI language never changes saved content language. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  status: ["Status", "Status", "Statut", "Estado"],
  addGoal: [
    "Add goal",
    "Ziel hinzufügen",
    "Ajouter un objectif",
    "Añadir objetivo",
  ],
  title: ["My workspace", "Mein Arbeitsplatz", "Mon espace", "Mi espacio"],
  design: [
    "Shop design",
    "Shop gestalten",
    "Design de boutique",
    "Diseño de tienda",
  ],
  lead: [
    "Your goals. Your next move.",
    "Deine Ziele. Dein nächster Schritt.",
    "Vos objectifs. Votre prochaine étape.",
    "Tus objetivos. Tu siguiente paso.",
  ],
  hint: [
    "A personal view of your shop. Your permissions and the selected sandbox always apply.",
    "Dein persönlicher Blick auf den Shop. Deine Rechte und die gewählte Sandbox gelten immer.",
    "Une vue personnelle. Vos droits et la sandbox sélectionnée restent applicables.",
    "Una vista personal. Se aplican tus permisos y la sandbox seleccionada.",
  ],
  saved: [
    "Workspace saved",
    "Arbeitsplatz gespeichert",
    "Espace enregistré",
    "Espacio guardado",
  ],
  save: [
    "Save workspace",
    "Arbeitsplatz speichern",
    "Enregistrer l’espace",
    "Guardar espacio",
  ],
  loading: [
    "Loading your workspace…",
    "Dein Arbeitsplatz wird geladen…",
    "Chargement de l’espace…",
    "Cargando tu espacio…",
  ],
  error: [
    "Could not load or save. Your changes are still here. Retry or reload after a conflict.",
    "Laden oder Speichern fehlgeschlagen. Deine Änderungen bleiben hier. Erneut versuchen oder bei einem Konflikt neu laden.",
    "Échec du chargement ou de l’enregistrement. Réessayez ou rechargez après un conflit.",
    "No se pudo cargar o guardar. Reintenta o recarga tras un conflicto.",
  ],
  reload: ["Reload", "Neu laden", "Recharger", "Recargar"],
  owner: ["Business", "Geschäft", "Activité", "Negocio"],
  service: [
    "Customer service",
    "Kundenservice",
    "Service client",
    "Atención al cliente",
  ],
  purchasing: [
    "Purchasing & B2B",
    "Einkauf & B2B",
    "Achats et B2B",
    "Compras y B2B",
  ],
  content: [
    "Content & marketing",
    "Content & Marketing",
    "Contenu et marketing",
    "Contenido y marketing",
  ],
  development: ["Development", "Entwicklung", "Développement", "Desarrollo"],
  create: [
    "Create area",
    "Arbeitsbereich anlegen",
    "Créer un espace",
    "Crear espacio",
  ],
  areaName: [
    "Area name",
    "Name des Arbeitsbereichs",
    "Nom de l’espace",
    "Nombre del espacio",
  ],
  preset: ["Start with", "Beginnen mit", "Commencer par", "Empezar con"],
  suggest: [
    "Suggest a layout for my permissions",
    "Aufbau passend zu meinen Rechten vorschlagen",
    "Proposer une disposition selon mes droits",
    "Sugerir diseño según mis permisos",
  ],
  up: ["Move up", "Nach oben", "Monter", "Subir"],
  down: ["Move down", "Nach unten", "Descendre", "Bajar"],
  remove: ["Remove", "Entfernen", "Retirer", "Quitar"],
  add: ["Add card", "Karte hinzufügen", "Ajouter une carte", "Añadir tarjeta"],
  pin: ["Pin view", "Ansicht anheften", "Épingler la vue", "Fijar vista"],
  pins: [
    "Pinned views",
    "Angeheftete Ansichten",
    "Vues épinglées",
    "Vistas fijadas",
  ],
  goal: [
    "What do you want to achieve?",
    "Was möchtest du erreichen?",
    "Que souhaitez-vous accomplir ?",
    "¿Qué quieres conseguir?",
  ],
  placeholder: [
    "Prepare our summer collection for France",
    "Unsere Sommerkollektion für Frankreich vorbereiten",
    "Préparer notre collection d’été pour la France",
    "Preparar nuestra colección de verano para Francia",
  ],
  plan: [
    "Prepare with the agent",
    "Mit dem Agenten vorbereiten",
    "Préparer avec l’agent",
    "Preparar con el agente",
  ],
  goals: [
    "Goals & decisions",
    "Ziele & Entscheidungen",
    "Objectifs et décisions",
    "Objetivos y decisiones",
  ],
  planned: ["Planned", "Geplant", "Planifié", "Planificado"],
  working: ["In progress", "In Arbeit", "En cours", "En curso"],
  review: [
    "Needs review",
    "Prüfung nötig",
    "À vérifier",
    "Pendiente de revisión",
  ],
  done: ["Done", "Erledigt", "Terminé", "Completado"],
  stopped: ["Stopped", "Gestoppt", "Arrêté", "Detenido"],
  agentHint: [
    "The agent prepares proposals in the existing assistant. Nothing is applied or published without the normal review.",
    "Der Agent bereitet Vorschläge im bestehenden Assistenten vor. Übernahme und Veröffentlichung laufen durch die gewohnte Prüfung.",
    "L’agent prépare des propositions dans l’assistant. Validation habituelle avant application ou publication.",
    "El agente prepara propuestas en el asistente. Se revisan antes de aplicar o publicar.",
  ],
  tasks: [
    "Agent proposals",
    "Agentenvorschläge",
    "Propositions de l’agent",
    "Propuestas del agente",
  ],
  sources: [
    "Sources and changes",
    "Quellen und Änderungen",
    "Sources et modifications",
    "Fuentes y cambios",
  ],
  open: ["Open", "Öffnen", "Ouvrir", "Abrir"],
  history: [
    "Layout history",
    "Verlauf der Anordnung",
    "Historique de disposition",
    "Historial del diseño",
  ],
  restore: [
    "Restore this layout",
    "Diese Anordnung wiederherstellen",
    "Restaurer cette disposition",
    "Restaurar este diseño",
  ],
  flow: [
    "Open Flow Builder",
    "Flow Builder öffnen",
    "Ouvrir le Flow Builder",
    "Abrir Flow Builder",
  ],
  flowHint: [
    "Create a recurring flow with an explicit trigger and review its scope before activation.",
    "Lege einen wiederkehrenden Flow mit einem ausdrücklichen Auslöser an und prüfe den Umfang vor der Aktivierung.",
    "Créez un flux récurrent avec un déclencheur explicite, puis vérifiez sa portée.",
    "Crea un flujo con desencadenante explícito y revisa su alcance antes de activarlo.",
  ],
} as const;
export type WorkspaceWord = keyof typeof words;
export function useWorkspaceText() {
  const { locale } = useLocale();
  const index =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (key: WorkspaceWord) => words[key][index];
}
