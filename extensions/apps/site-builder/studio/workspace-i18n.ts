/** Shared visual workspace vocabulary; interface choices never become untranslated content. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  edit: ["Edit", "Bearbeiten", "Modifier", "Editar"],
  blocks: ["Elements", "Bausteine", "Éléments", "Elementos"],
  agent: ["Agent", "Agent", "Agent", "Agente"],
  history: ["History", "Verlauf", "Historique", "Historial"],
  pages: ["Pages", "Seiten", "Pages", "Páginas"],
  sections: [
    "On this page",
    "Auf dieser Seite",
    "Sur cette page",
    "En esta página",
  ],
  addPage: [
    "Add page",
    "Seite hinzufügen",
    "Ajouter une page",
    "Añadir página",
  ],
  addElement: [
    "Add an element",
    "Baustein hinzufügen",
    "Ajouter un élément",
    "Añadir elemento",
  ],
  builtIn: [
    "Shop elements",
    "Shop-Bausteine",
    "Éléments de boutique",
    "Elementos de tienda",
  ],
  fromApps: [
    "From your apps",
    "Aus deinen Apps",
    "Depuis vos apps",
    "De tus apps",
  ],
  app: ["App element", "App-Baustein", "Élément d’app", "Elemento de app"],
  noApps: [
    "Installed apps can add their own elements here.",
    "Installierte Apps können hier eigene Bausteine anbieten.",
    "Les apps installées peuvent proposer leurs éléments ici.",
    "Las apps instaladas pueden añadir elementos aquí.",
  ],
  choose: [
    "Choose an element in the preview to edit it.",
    "Klicke in der Vorschau auf den Bereich, den du bearbeiten möchtest.",
    "Choisissez un élément dans l’aperçu pour le modifier.",
    "Elige un elemento en la vista previa para editarlo.",
  ],
  heroHint: [
    "Headline, image and call to action",
    "Überschrift, Bild und Handlungsaufruf",
    "Titre, image et appel à l’action",
    "Título, imagen y llamada a la acción",
  ],
  textHint: [
    "Stories, advice and formatted text",
    "Geschichten, Beratung und formatierter Text",
    "Histoires, conseils et texte enrichi",
    "Historias, consejos y texto con formato",
  ],
  productsHint: [
    "Products from your live catalogue",
    "Produkte aus deinem Katalog",
    "Produits de votre catalogue",
    "Productos de tu catálogo",
  ],
  imageHint: [
    "A photograph or visual statement",
    "Ein Foto oder ein starkes Motiv",
    "Une photo ou un visuel fort",
    "Una foto o un motivo visual",
  ],
  formHint: [
    "Contact, enquiries and workflows",
    "Kontakt, Anfragen und Folgeprozesse",
    "Contact, demandes et processus",
    "Contacto, consultas y procesos",
  ],
  articlesHint: [
    "Recent posts and editorial stories",
    "Aktuelle Beiträge und Geschichten",
    "Articles récents et histoires",
    "Publicaciones recientes e historias",
  ],
  search: [
    "Find an element…",
    "Baustein suchen…",
    "Chercher un élément…",
    "Buscar un elemento…",
  ],
  move: [
    "Move element",
    "Baustein verschieben",
    "Déplacer l’élément",
    "Mover elemento",
  ],
  wholePage: ["Whole page", "Ganze Seite", "Toute la page", "Toda la página"],
  selection: [
    "Selected section",
    "Ausgewählter Bereich",
    "Section sélectionnée",
    "Sección seleccionada",
  ],
  scope: ["Work on", "Bearbeitungsumfang", "Portée", "Alcance"],
  saveFirst: [
    "The agent saves your current private draft before preparing reviewable changes. Publishing remains separate.",
    "Der Agent speichert deinen aktuellen privaten Entwurf, bevor er prüfbare Änderungen vorbereitet. Veröffentlichen bleibt ein eigener Schritt.",
    "L’agent enregistre le brouillon privé avant de préparer les modifications à vérifier. La publication reste séparée.",
    "El agente guarda el borrador privado antes de preparar cambios revisables. La publicación es independiente.",
  ],
  references: [
    "References and design direction",
    "Referenzen und Gestaltungsrichtung",
    "Références et direction créative",
    "Referencias y dirección de diseño",
  ],
  prepare: [
    "Prepare a private draft",
    "Privaten Entwurf vorbereiten",
    "Préparer un brouillon privé",
    "Preparar un borrador privado",
  ],
  unavailable: [
    "This app element is unavailable. Its app may be disabled or no longer allow this surface.",
    "Dieser App-Baustein ist nicht verfügbar. Die App ist möglicherweise deaktiviert oder bietet ihn nicht mehr an.",
    "Cet élément est indisponible. Son app peut être désactivée ou ne plus proposer cette surface.",
    "Este elemento no está disponible. Su app puede estar desactivada o ya no ofrecer esta superficie.",
  ],
  appPreview: [
    "App preview · interactions are disabled while designing",
    "App-Vorschau · Interaktionen sind beim Gestalten gesperrt",
    "Aperçu d’app · interactions désactivées pendant la conception",
    "Vista de app · interacciones desactivadas al diseñar",
  ],
} as const;
export function useWorkspaceText() {
  const { locale } = useLocale();
  const index = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale];
  return (key: keyof typeof words) => words[key][index];
}
