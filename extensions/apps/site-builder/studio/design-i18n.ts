/** Complete interface vocabulary for the standard-shop designer, independent of page translations. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  discardTitle: [
    "Discard unsaved changes?",
    "Ungespeicherte Änderungen verwerfen?",
    "Abandonner les modifications ?",
    "¿Descartar cambios sin guardar?",
  ],
  discardHint: [
    "Save this draft first to keep your edits. Continuing opens the selected page or channel without saving.",
    "Speichere zuerst, um deine Änderungen zu behalten. Beim Fortfahren wird die gewählte Seite oder der Kanal ohne Speichern geöffnet.",
    "Enregistrez d’abord pour conserver les changements. Continuer ouvre la page ou le canal sans enregistrer.",
    "Guarda primero para conservar los cambios. Continuar abre la página o canal sin guardar.",
  ],
  sans: ["Sans serif", "Serifenlos", "Sans empattement", "Sin serifa"],
  serif: ["Serif", "Serifen", "Avec empattement", "Con serifa"],
  mono: ["Monospace", "Nichtproportional", "Chasse fixe", "Monoespaciada"],
  title: [
    "Shop design",
    "Shop gestalten",
    "Design de boutique",
    "Diseño de tienda",
  ],
  hint: [
    "Select a channel. Shape its pages with the same renderer your customers see.",
    "Wähle einen Kanal. Gestalte seine Seiten mit demselben Renderer, den deine Kunden sehen.",
    "Choisissez un canal et concevez ses pages avec le même rendu que vos clients.",
    "Elige un canal y diseña sus páginas con el mismo renderizado que ven tus clientes.",
  ],
  pages: [
    "Pages & navigation",
    "Seiten & Navigation",
    "Pages et navigation",
    "Páginas y navegación",
  ],
  addPage: ["New page", "Neue Seite", "Nouvelle page", "Nueva página"],
  page: ["Page", "Seite", "Page", "Página"],
  landing: ["Campaign", "Kampagne", "Campagne", "Campaña"],
  blog: ["Blog", "Blog", "Blog", "Blog"],
  article: ["Article", "Artikel", "Article", "Artículo"],
  form: ["Form", "Formular", "Formulaire", "Formulario"],
  hero: ["Hero", "Aufmacher", "En-tête", "Cabecera"],
  text: [
    "Rich text",
    "Formatierter Text",
    "Texte enrichi",
    "Texto enriquecido",
  ],
  products: ["Products", "Produkte", "Produits", "Productos"],
  image: ["Image", "Bild", "Image", "Imagen"],
  articles: [
    "Article list",
    "Artikelliste",
    "Liste d’articles",
    "Lista de artículos",
  ],
  save: [
    "Save draft",
    "Entwurf speichern",
    "Enregistrer le brouillon",
    "Guardar borrador",
  ],
  saved: [
    "Draft saved",
    "Entwurf gespeichert",
    "Brouillon enregistré",
    "Borrador guardado",
  ],
  publish: [
    "Review publication",
    "Veröffentlichung prüfen",
    "Vérifier la publication",
    "Revisar publicación",
  ],
  sandbox: [
    "Edit in a private sandbox",
    "In privater Sandbox bearbeiten",
    "Modifier dans une sandbox privée",
    "Editar en una sandbox privada",
  ],
  sandboxHint: [
    "Prepare changes here, then release selected pages through the existing staging review. Orders and payments stay with the live shop.",
    "Bereite Änderungen hier vor und übernimm ausgewählte Seiten über die bestehende Staging-Prüfung. Bestellungen und Zahlungen bleiben im Live-Shop.",
    "Préparez les changements ici, puis publiez les pages sélectionnées après validation.",
    "Prepara cambios aquí y publica las páginas seleccionadas tras revisarlas.",
  ],
  readOnly: [
    "Live view · create or select a sandbox to edit",
    "Live-Ansicht · zum Bearbeiten eine Sandbox erstellen oder wählen",
    "Vue en ligne · choisissez une sandbox pour modifier",
    "Vista en vivo · elige una sandbox para editar",
  ],
  install: [
    "Set up shop design",
    "Shop-Gestaltung einrichten",
    "Configurer le design",
    "Configurar diseño",
  ],
  installHint: [
    "Review the two app packages. Pages use channel permissions; form responses stay in a private inbox.",
    "Prüfe die beiden App-Pakete. Seiten nutzen Kanalrechte; Formularantworten bleiben im privaten Eingang.",
    "Vérifiez les deux apps. Les pages utilisent les droits des canaux ; les réponses restent privées.",
    "Revisa ambas apps. Las páginas usan permisos del canal; las respuestas son privadas.",
  ],
  approve: [
    "Approve installation",
    "Installation freigeben",
    "Autoriser l’installation",
    "Aprobar instalación",
  ],
  titleField: ["Title", "Titel", "Titre", "Título"],
  slug: [
    "Page address",
    "Seitenadresse",
    "Adresse de page",
    "Dirección de página",
  ],
  status: [
    "Publication state",
    "Veröffentlichungsstatus",
    "État de publication",
    "Estado de publicación",
  ],
  draft: ["Draft", "Entwurf", "Brouillon", "Borrador"],
  published: [
    "Ready to publish",
    "Zur Veröffentlichung bereit",
    "Prêt à publier",
    "Listo para publicar",
  ],
  archived: ["Archived", "Archiviert", "Archivé", "Archivado"],
  schedule: [
    "Visible from (local time)",
    "Sichtbar ab (Ortszeit)",
    "Visible à partir de (heure locale)",
    "Visible desde (hora local)",
  ],
  properties: ["Properties", "Eigenschaften", "Propriétés", "Propiedades"],
  theme: ["Shop appearance", "Shop-Gestaltung", "Apparence", "Apariencia"],
  accent: ["Accent", "Akzent", "Accent", "Acento"],
  background: ["Background", "Hintergrund", "Fond", "Fondo"],
  foreground: [
    "Text color",
    "Textfarbe",
    "Couleur du texte",
    "Color del texto",
  ],
  font: ["Typography", "Typografie", "Typographie", "Tipografía"],
  spacing: ["Spacing", "Abstände", "Espacement", "Espaciado"],
  radius: ["Corners", "Ecken", "Coins", "Esquinas"],
  columns: [
    "Product columns",
    "Produktspalten",
    "Colonnes de produits",
    "Columnas de productos",
  ],
  inherit: [
    "Use inherited appearance",
    "Geerbte Gestaltung verwenden",
    "Hériter de l’apparence",
    "Heredar apariencia",
  ],
  global: [
    "All channels · inherited base",
    "Alle Kanäle · gemeinsame Basis",
    "Tous les canaux · base héritée",
    "Todos los canales · base heredada",
  ],
  preview: ["Preview", "Vorschau", "Aperçu", "Vista previa"],
  desktop: ["Desktop", "Desktop", "Ordinateur", "Escritorio"],
  tablet: ["Tablet", "Tablet", "Tablette", "Tableta"],
  mobile: ["Mobile", "Mobil", "Mobile", "Móvil"],
  select: [
    "Select an element in the preview",
    "Wähle ein Element in der Vorschau",
    "Sélectionnez un élément dans l’aperçu",
    "Selecciona un elemento en la vista previa",
  ],
  addBlock: [
    "Add section",
    "Abschnitt hinzufügen",
    "Ajouter une section",
    "Añadir sección",
  ],
  remove: ["Remove", "Entfernen", "Retirer", "Quitar"],
  up: ["Move up", "Nach oben", "Monter", "Subir"],
  down: ["Move down", "Nach unten", "Descendre", "Bajar"],
  error: [
    "Could not complete this action. Your draft is preserved. Check permissions, input or reload after a conflict.",
    "Aktion fehlgeschlagen. Dein Entwurf bleibt erhalten. Prüfe Rechte und Eingaben oder lade bei einem Konflikt neu.",
    "Action impossible. Votre brouillon est conservé. Vérifiez les droits et les données.",
    "No se pudo completar. Se conserva el borrador. Revisa permisos y datos.",
  ],
} as const;
export type DesignWord = keyof typeof words;
export function useDesignText() {
  const { locale } = useLocale();
  const i =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (key: DesignWord) => words[key][i];
}
