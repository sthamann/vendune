/** Merchant-only catalogue setup copy; shopper recommendation prompts remain separate. */
import { useLocale } from "./i18n";
export const catalogIntakeWords = {
  title: [
    "Build your catalogue",
    "Sortiment aufbauen",
    "Créer le catalogue",
    "Crear catálogo",
  ],
  intro: [
    "Bring in your products or try an idea with sample products. Review first; save only in a private sandbox.",
    "Übernimm deine Produkte oder teste eine Idee mit Beispieldaten. Erst prüfen, dann in einer privaten Sandbox anlegen.",
    "Importez vos produits ou testez une idée avec des exemples. Vérifiez avant d’enregistrer en sandbox privée.",
    "Importa tus productos o prueba una idea con ejemplos. Revisa antes de guardar en una sandbox privada.",
  ],
  csv: ["Upload CSV", "CSV hochladen", "Importer un CSV", "Subir CSV"],
  url: [
    "Product or shop URL",
    "Produkt- oder Shop-URL",
    "URL de produit ou boutique",
    "URL de producto o tienda",
  ],
  demo: [
    "Describe sample products",
    "Beispielprodukte beschreiben",
    "Décrire des produits fictifs",
    "Describir productos de ejemplo",
  ],
  csvHint: [
    "UTF-8 CSV, up to 200 kB and 50 products. Required columns: name,price. Optional: description,productNumber,imageUrl. Prices use the shop currency; stock starts at zero.",
    "UTF-8-CSV bis 200 kB und 50 Produkte. Pflichtspalten: name,price. Optional: description,productNumber,imageUrl. Preise in Shop-Währung; Bestand startet bei null.",
    "CSV UTF-8, 200 ko et 50 produits maximum. Colonnes : name,price ; facultatives : description,productNumber,imageUrl. Devise de la boutique ; stock initial zéro.",
    "CSV UTF-8, máximo 200 kB y 50 productos. Columnas: name,price; opcionales: description,productNumber,imageUrl. Divisa de la tienda; stock inicial cero.",
  ],
  template: [
    "Download CSV template",
    "CSV-Vorlage herunterladen",
    "Télécharger un modèle CSV",
    "Descargar plantilla CSV",
  ],
  urlPlaceholder: ["https://", "https://", "https://", "https://"],
  source: [
    "Product source",
    "Produktquelle",
    "Source des produits",
    "Origen de productos",
  ],
  brief: [
    "What products do you want to try?",
    "Welche Produkte möchtest du ausprobieren?",
    "Quels produits voulez-vous essayer ?",
    "¿Qué productos quieres probar?",
  ],
  briefPlaceholder: [
    "For example: a compact reading corner with an armchair, lamp and side table under €300 in total.",
    "Zum Beispiel: eine kompakte Leseecke mit Sessel, Leuchte und Beistelltisch für insgesamt unter 300 €.",
    "Par exemple : coin lecture avec fauteuil, lampe et table pour moins de 300 € au total.",
    "Por ejemplo: rincón de lectura con sillón, lámpara y mesa por menos de 300 € en total.",
  ],
  urlHint: [
    "An accessible HTTPS page, not a complete crawl. Check prices, currency, image rights and extracted content. Dynamic pages may need a product detail URL or CSV.",
    "Eine erreichbare HTTPS-Seite, kein vollständiger Crawl. Prüfe Preise, Währung, Bildrechte und übernommene Inhalte. Bei dynamischen Seiten bitte eine Produktdetail-URL oder CSV verwenden.",
    "Une page HTTPS accessible, pas un crawl complet. Vérifiez prix, devise, droits des images et contenu. Une page dynamique peut nécessiter une URL détaillée ou un CSV.",
    "Una página HTTPS accesible, no un rastreo completo. Revisa precios, divisa, derechos de imágenes y contenido. Las páginas dinámicas pueden requerir una URL de detalle o CSV.",
  ],
  demoHint: [
    "Fictional products and illustrative prices in the shop main language. No real stock or payment is created in the live shop.",
    "Fiktive Produkte und Beispielpreise in der Shop-Hauptsprache. Im Live-Shop entstehen weder Bestand noch Zahlungen.",
    "Produits fictifs et prix indicatifs dans la langue principale. Aucun stock ni paiement réel dans la boutique publique.",
    "Productos ficticios y precios ilustrativos en el idioma principal. Sin existencias ni pagos reales en la tienda pública.",
  ],
  count: [
    "Number of products (1–10)",
    "Anzahl der Produkte (1–10)",
    "Nombre de produits (1–10)",
    "Número de productos (1–10)",
  ],
  sandbox: [
    "Private sandbox",
    "Private Sandbox",
    "Sandbox privée",
    "Sandbox privada",
  ],
  choose: [
    "Choose a sandbox",
    "Sandbox auswählen",
    "Choisir une sandbox",
    "Elegir sandbox",
  ],
  newSandbox: [
    "Create a catalogue sandbox",
    "Sandbox für Produkte anlegen",
    "Créer une sandbox de catalogue",
    "Crear sandbox de catálogo",
  ],
  needSandbox: [
    "Choose or create a private sandbox. Your live catalogue stays unchanged. Sandbox management permission is required to create one.",
    "Wähle eine private Sandbox oder lege eine an. Dein Live-Sortiment bleibt unverändert. Zum Anlegen brauchst du das Recht zur Sandbox-Verwaltung.",
    "Choisissez ou créez une sandbox privée. Le catalogue public reste inchangé. La création nécessite le droit de gestion des sandboxes.",
    "Elige o crea una sandbox privada. El catálogo público no cambia. Crear una requiere permiso de gestión de sandboxes.",
  ],
  prepare: [
    "Prepare product preview",
    "Produktvorschau vorbereiten",
    "Préparer l’aperçu",
    "Preparar vista previa",
  ],
  preparing: [
    "Preparing the preview… Nothing has been saved yet.",
    "Produktvorschau wird vorbereitet … Noch wurde nichts gespeichert.",
    "Préparation de l’aperçu… Rien n’est encore enregistré.",
    "Preparando vista previa… Aún no se ha guardado nada.",
  ],
  review: [
    "Review and edit products",
    "Produkte prüfen und bearbeiten",
    "Vérifier et modifier",
    "Revisar y editar productos",
  ],
  reviewHint: [
    "Only selected products are created. Check the tax rate. Publication is a separate reviewed step; images are optional jobs with their own review.",
    "Nur ausgewählte Produkte werden angelegt. Prüfe den Steuersatz. Die Veröffentlichung bleibt ein eigener Prüfschritt; Bilder sind optionale Aufträge mit eigener Freigabe.",
    "Seuls les produits sélectionnés sont créés. Vérifiez la TVA. Publication et images font l’objet de validations distinctes.",
    "Solo se crean los productos seleccionados. Revisa impuestos. La publicación y las imágenes requieren revisiones independientes.",
  ],
  select: [
    "Select product",
    "Produkt auswählen",
    "Sélectionner le produit",
    "Seleccionar producto",
  ],
  name: [
    "Product name",
    "Produktname",
    "Nom du produit",
    "Nombre del producto",
  ],
  sourceFields: [
    "Product number and image source",
    "Produktnummer und Bildquelle",
    "Référence et source de l’image",
    "Referencia y origen de imagen",
  ],
  productNumber: [
    "Product number",
    "Produktnummer",
    "Référence produit",
    "Referencia de producto",
  ],
  imageUrl: ["Image URL", "Bild-URL", "URL de l’image", "URL de imagen"],
  description: ["Description", "Beschreibung", "Description", "Descripción"],
  price: ["Price", "Preis", "Prix", "Precio"],
  tax: [
    "Reviewed tax rate (%)",
    "Geprüfter Steuersatz (%)",
    "Taux de TVA vérifié (%)",
    "Tipo impositivo revisado (%)",
  ],
  images: [
    "Prepare AI images after creation",
    "Nach dem Anlegen KI-Bilder vorbereiten",
    "Préparer des images IA après création",
    "Preparar imágenes IA tras crear",
  ],
  imageHint: [
    "Up to 10 images per batch. Uses the configured image provider. Each image stays private until you review it in the product editor.",
    "Bis zu 10 Bilder pro Durchgang mit dem konfigurierten Bildanbieter. Jedes Bild bleibt bis zu deiner Prüfung im Produkteditor privat.",
    "Jusqu’à 10 images par lot via le fournisseur configuré. Chaque image reste privée jusqu’à validation dans la fiche produit.",
    "Hasta 10 imágenes por lote mediante el proveedor configurado. Cada imagen permanece privada hasta revisarla en el editor.",
  ],
  imageUnavailable: [
    "No image provider is configured. Products can be created without generated images.",
    "Kein Bildanbieter eingerichtet. Produkte lassen sich ohne generierte Bilder anlegen.",
    "Aucun fournisseur d’images configuré. Les produits peuvent être créés sans images générées.",
    "No hay proveedor de imágenes configurado. Puedes crear productos sin imágenes generadas.",
  ],
  imagePrompt: [
    "Create a clear catalogue photograph of this fictional sample product on a neutral background. No text or logos.",
    "Erzeuge ein klares Katalogfoto dieses fiktiven Beispielprodukts vor neutralem Hintergrund. Keine Schrift oder Logos.",
    "Créez une photo de catalogue nette de ce produit fictif sur fond neutre, sans texte ni logo.",
    "Crea una fotografía de catálogo clara de este producto ficticio sobre fondo neutro. Sin texto ni logotipos.",
  ],
  save: [
    "Create selected products in sandbox",
    "Auswahl in Sandbox anlegen",
    "Créer la sélection en sandbox",
    "Crear selección en sandbox",
  ],
  saving: [
    "Saving selected products…",
    "Ausgewählte Produkte werden gespeichert …",
    "Enregistrement de la sélection…",
    "Guardando productos seleccionados…",
  ],
  saved: [
    "Saved in sandbox",
    "In Sandbox gespeichert",
    "Enregistré en sandbox",
    "Guardado en sandbox",
  ],
  imageQueued: [
    "Image queued · review in product editor",
    "Bild beauftragt · im Produkteditor prüfen",
    "Image en attente · vérifier dans l’éditeur",
    "Imagen en cola · revisar en el editor",
  ],
  open: [
    "Open product",
    "Produkt öffnen",
    "Ouvrir le produit",
    "Abrir producto",
  ],
  close: [
    "Close catalogue setup",
    "Sortimentsaufbau schließen",
    "Fermer la création du catalogue",
    "Cerrar creación de catálogo",
  ],
  again: [
    "Prepare a different source",
    "Andere Quelle vorbereiten",
    "Préparer une autre source",
    "Preparar otro origen",
  ],
  fileInvalid: [
    "Choose a UTF-8 .csv file up to 200 kB.",
    "Wähle eine UTF-8-Datei mit Endung .csv bis 200 kB.",
    "Choisissez un fichier .csv UTF-8 de 200 ko maximum.",
    "Elige un archivo .csv UTF-8 de hasta 200 kB.",
  ],
  noAi: [
    "AI preparation requires assistant permission. CSV import remains available.",
    "Für die KI-Vorbereitung brauchst du das Assistentenrecht. CSV-Import bleibt verfügbar.",
    "La préparation IA nécessite le droit d’assistant. Le CSV reste disponible.",
    "La preparación IA requiere permiso de asistente. El CSV sigue disponible.",
  ],
  merchantPrompt: [
    "Help me build my shop catalogue: offer CSV upload, product URLs or described sample products with images in a private sandbox. Ask which source I want to use.",
    "Hilf mir, mein Shop-Sortiment aufzubauen: Biete CSV-Upload, Produkt-URLs oder beschriebene Beispielprodukte mit Bildern in einer privaten Sandbox an. Frage mich, welche Quelle ich verwenden möchte.",
    "Aidez-moi à créer le catalogue de ma boutique : CSV, URL de produits ou produits fictifs décrits avec images en sandbox privée. Demandez quelle source utiliser.",
    "Ayúdame a crear el catálogo de mi tienda: CSV, URL de productos o ejemplos descritos con imágenes en sandbox privada. Pregunta qué origen quiero usar.",
  ],
  knowledgePrompt: [
    "Which products in my shop have incomplete content? Show concrete gaps and propose next steps for me as the merchant.",
    "Welche Produkte in meinem Shop haben unvollständige Inhalte? Zeige konkrete Lücken und nächste Schritte für mich als Händler.",
    "Quels produits de ma boutique ont un contenu incomplet ? Montrez les lacunes et prochaines étapes pour moi, marchand.",
    "¿Qué productos de mi tienda tienen contenido incompleto? Muestra carencias y próximos pasos para mí como comerciante.",
  ],
} as const;
export function useCatalogIntakeText() {
  const { locale } = useLocale();
  const index = ({ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 } as const)[
    locale
  ];
  return (key: keyof typeof catalogIntakeWords) =>
    catalogIntakeWords[key][index];
}
