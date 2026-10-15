/** Inspector, history and reference-agent vocabulary. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  provided: [
    "Image supplied",
    "Bild bereitgestellt",
    "Image fournie",
    "Imagen proporcionada",
  ],
  partial: [
    "Partial HTML capture",
    "HTML teilweise erfasst",
    "HTML capturé partiellement",
    "HTML capturado parcialmente",
  ],
  notCaptured: [
    "Unavailable",
    "Nicht erfasst",
    "Indisponible",
    "No disponible",
  ],
  partialHint: [
    "Source HTML only; visual layout, scripts and videos were not fully captured.",
    "Nur HTML-Quelltext; visuelles Layout, Skripte und Videos wurden nicht vollständig erfasst.",
    "HTML source uniquement ; mise en page, scripts et vidéos non capturés intégralement.",
    "Solo HTML fuente; diseño, scripts y vídeos no capturados completamente.",
  ],
  sourceHint: [
    "Upload a screenshot or choose another public HTTPS reference.",
    "Lade einen Screenshot hoch oder wähle eine andere öffentliche HTTPS-Referenz.",
    "Ajoutez une capture ou choisissez une autre référence HTTPS publique.",
    "Sube una captura o elige otra referencia HTTPS pública.",
  ],
  agent: [
    "Design with the agent",
    "Mit dem Agenten gestalten",
    "Concevoir avec l’agent",
    "Diseñar con el agente",
  ],
  instruction: [
    "Describe the change",
    "Änderung beschreiben",
    "Décrire la modification",
    "Describe el cambio",
  ],
  instructionHint: [
    "More breathing room, bigger product images, less text",
    "Mehr Luft, größere Produktbilder, weniger Text",
    "Plus d’espace, des images plus grandes, moins de texte",
    "Más espacio, imágenes más grandes, menos texto",
  ],
  references: [
    "Reference URLs (one per line)",
    "Referenz-URLs (eine pro Zeile)",
    "URL de référence (une par ligne)",
    "URL de referencia (una por línea)",
  ],
  upload: [
    "Screenshots, logo or design · PNG/JPEG/WebP · max. 2 × 1 MiB",
    "Screenshots, Logo oder Entwurf · PNG/JPEG/WebP · max. 2 × 1 MiB",
    "Captures, logo ou design · PNG/JPEG/WebP · max. 2 × 1 Mio",
    "Capturas, logo o diseño · PNG/JPEG/WebP · máx. 2 × 1 MiB",
  ],
  style: ["Style", "Stil", "Style", "Estilo"],
  structure: ["Structure", "Struktur", "Structure", "Estructura"],
  content: ["Content", "Inhalte", "Contenu", "Contenido"],
  generate: [
    "Prepare alternatives",
    "Alternativen vorbereiten",
    "Préparer des variantes",
    "Preparar alternativas",
  ],
  generating: [
    "Preparing reviewable alternatives. Your saved page stays unchanged.",
    "Prüfbare Alternativen werden vorbereitet. Deine gespeicherte Seite bleibt unverändert.",
    "Préparation des variantes. La page enregistrée reste inchangée.",
    "Preparando alternativas. La página guardada no cambia.",
  ],
  before: [
    "Current draft",
    "Aktueller Entwurf",
    "Brouillon actuel",
    "Borrador actual",
  ],
  after: [
    "Proposed design",
    "Designvorschlag",
    "Design proposé",
    "Diseño propuesto",
  ],
  apply: [
    "Approve in sandbox",
    "In Sandbox übernehmen",
    "Approuver dans la sandbox",
    "Aprobar en sandbox",
  ],
  discard: [
    "Discard proposal",
    "Vorschlag verwerfen",
    "Rejeter la proposition",
    "Descartar propuesta",
  ],
  history: [
    "Page & section history",
    "Seiten- & Abschnittsverlauf",
    "Historique des pages et sections",
    "Historial de páginas y secciones",
  ],
  restore: [
    "Restore page as a draft",
    "Seite als Entwurf wiederherstellen",
    "Restaurer la page en brouillon",
    "Restaurar página como borrador",
  ],
  restoreSection: [
    "Restore selected section",
    "Gewählten Abschnitt wiederherstellen",
    "Restaurer la section sélectionnée",
    "Restaurar sección seleccionada",
  ],
  author: ["Author", "Autor", "Auteur", "Autor"],
  category: [
    "Article category",
    "Artikelkategorie",
    "Catégorie d’article",
    "Categoría del artículo",
  ],
  seo: [
    "Search description",
    "Suchbeschreibung",
    "Description pour la recherche",
    "Descripción de búsqueda",
  ],
  image: ["Image URL", "Bild-URL", "URL d’image", "URL de imagen"],
  field: ["Add field", "Feld hinzufügen", "Ajouter un champ", "Añadir campo"],
  label: [
    "Field label",
    "Feldbeschriftung",
    "Libellé du champ",
    "Etiqueta del campo",
  ],
  required: ["Required", "Pflichtfeld", "Obligatoire", "Obligatorio"],
  email: ["Email", "E-Mail", "E-mail", "Correo electrónico"],
  number: ["Number", "Zahl", "Nombre", "Número"],
  checkbox: ["Checkbox", "Kontrollkästchen", "Case à cocher", "Casilla"],
  textarea: ["Long text", "Langer Text", "Texte long", "Texto largo"],
  responses: [
    "Form responses",
    "Formularantworten",
    "Réponses au formulaire",
    "Respuestas del formulario",
  ],
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
  empty: [
    "No content yet. Add your first section.",
    "Noch kein Inhalt. Füge den ersten Abschnitt hinzu.",
    "Aucun contenu. Ajoutez une section.",
    "Sin contenido. Añade una sección.",
  ],
  allProducts: [
    "All channel products",
    "Alle Kanalprodukte",
    "Tous les produits du canal",
    "Todos los productos del canal",
  ],
  buy: [
    "Add to bag",
    "In den Warenkorb",
    "Ajouter au panier",
    "Añadir a la cesta",
  ],
} as const;
export function useEditorText() {
  const { locale } = useLocale();
  const i =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (key: keyof typeof words) => words[key][i];
}
