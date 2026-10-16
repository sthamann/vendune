/** Editor gesture and reference guidance stays localized independently of merchant content. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  before: ["Insert before", "Einfügen vor", "Insérer avant", "Insertar antes"],
  atEnd: [
    "Insert at the end",
    "Am Ende einfügen",
    "Insérer à la fin",
    "Insertar al final",
  ],
  urlPlaceholder: [
    "https://your-reference-shop.example",
    "https://dein-referenzshop.example",
    "https://votre-boutique-reference.example",
    "https://tu-tienda-referencia.example",
  ],
  dropHere: ["Drop here", "Hier ablegen", "Déposer ici", "Soltar aquí"],
  controls: [
    "Element controls",
    "Baustein-Werkzeuge",
    "Outils de l’élément",
    "Controles del elemento",
  ],
  dragElement: [
    "Drag to move · or use the arrows",
    "Zum Verschieben ziehen · oder Pfeile verwenden",
    "Glisser pour déplacer · ou utiliser les flèches",
    "Arrastra para mover · o usa las flechas",
  ],
  removeElement: [
    "Remove element",
    "Baustein entfernen",
    "Supprimer l’élément",
    "Eliminar elemento",
  ],
  dragHint: [
    "Drag an element into the preview. The blue line marks its position. Or click to insert after your selection.",
    "Ziehe einen Baustein in die Vorschau. Die blaue Linie zeigt seine Position. Oder klicke zum Einfügen hinter deiner Auswahl.",
    "Glissez un élément dans l’aperçu. La ligne bleue indique sa position. Ou cliquez pour insérer après la sélection.",
    "Arrastra un elemento a la vista previa. La línea azul indica su posición. O haz clic para insertar tras la selección.",
  ],
  referenceTitle: [
    "Start with a design you like",
    "Starte mit einem Design, das dir gefällt",
    "Partez d’un design qui vous plaît",
    "Empieza con un diseño que te guste",
  ],
  referenceHint: [
    "Add a shop URL or screenshots, then describe what to adapt. Preview alternatives with your own products before applying.",
    "Füge eine Shop-URL oder Screenshots hinzu und beschreibe, was du übernehmen möchtest. Prüfe die Varianten mit deinen eigenen Produkten vor dem Übernehmen.",
    "Ajoutez une URL ou des captures et décrivez les adaptations. Vérifiez les variantes avec vos produits avant de les appliquer.",
    "Añade una URL o capturas y describe qué adaptar. Revisa variantes con tus productos antes de aplicarlas.",
  ],
  uploadDesign: [
    "Upload screenshots or designs",
    "Screenshots oder Designs hochladen",
    "Importer des captures ou designs",
    "Subir capturas o diseños",
  ],
  dropImages: [
    "Drop images here or choose files",
    "Bilder hier ablegen oder Dateien auswählen",
    "Déposez des images ou choisissez des fichiers",
    "Suelta imágenes o elige archivos",
  ],
  imageHint: [
    "Up to 2 PNG, JPEG or WebP images, 12 MB each. Large images are reduced automatically.",
    "Bis zu 2 PNG-, JPEG- oder WebP-Bilder, je 12 MB. Große Bilder werden automatisch verkleinert.",
    "Jusqu’à 2 images PNG, JPEG ou WebP, 12 Mo chacune. Les grandes images sont réduites automatiquement.",
    "Hasta 2 imágenes PNG, JPEG o WebP, 12 MB cada una. Las imágenes grandes se reducen automáticamente.",
  ],
  imageError: [
    "Use up to 2 valid PNG, JPEG or WebP images, at most 12 MB each. Your previous references are unchanged.",
    "Verwende bis zu 2 gültige PNG-, JPEG- oder WebP-Bilder mit je maximal 12 MB. Deine bisherigen Referenzen bleiben erhalten.",
    "Utilisez jusqu’à 2 images PNG, JPEG ou WebP valides, de 12 Mo maximum. Vos références précédentes sont conservées.",
    "Usa hasta 2 imágenes PNG, JPEG o WebP válidas, de máximo 12 MB. Tus referencias anteriores se conservan.",
  ],
  preparingImages: [
    "Preparing design references…",
    "Design-Referenzen werden vorbereitet…",
    "Préparation des références…",
    "Preparando referencias…",
  ],
  urlHint: [
    "Up to 3 HTTPS URLs, one per line. URL capture reads available page HTML; screenshots provide the visual reference.",
    "Bis zu 3 HTTPS-URLs, eine pro Zeile. URLs liefern verfügbaren Seiteninhalt; Screenshots ergänzen die visuelle Referenz.",
    "Jusqu’à 3 URL HTTPS, une par ligne. La capture lit le HTML disponible ; les captures d’écran apportent la référence visuelle.",
    "Hasta 3 URL HTTPS, una por línea. Se captura el HTML disponible; las capturas aportan la referencia visual.",
  ],
  urlError: [
    "Enter up to 3 public HTTPS URLs without credentials, one per line.",
    "Gib bis zu 3 öffentliche HTTPS-URLs ohne Zugangsdaten ein, eine pro Zeile.",
    "Saisissez jusqu’à 3 URL HTTPS publiques sans identifiants, une par ligne.",
    "Introduce hasta 3 URL HTTPS públicas sin credenciales, una por línea.",
  ],
  samplePrompt: [
    "Adapt the style and layout of my references to this shop. Keep our products and facts.",
    "Passe Stil und Aufbau meiner Referenzen auf diesen Shop an. Behalte unsere Produkte und Fakten bei.",
    "Adaptez le style et la structure des références à cette boutique. Conservez nos produits et informations.",
    "Adapta el estilo y la estructura de mis referencias a esta tienda. Conserva nuestros productos y datos.",
  ],
  usePrompt: [
    "Use this design brief",
    "Diesen Designauftrag verwenden",
    "Utiliser ce brief",
    "Usar estas instrucciones",
  ],
} as const;
export function useInteractionText() {
  const { locale } = useLocale();
  const index = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale];
  return (key: keyof typeof words) => words[key][index];
}
