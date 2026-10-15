/** Shared EN/DE/FR/ES guidance for app design, settings and bounded automation. */
import { useLocale } from "./i18n";
export const workspaceWords = {
  agentAdvanced: [
    "Schema & manual import",
    "Schema & manueller Import",
    "Schéma et import manuel",
    "Esquema e importación manual",
  ],
  agentTitle: ["AI assistant", "KI-Assistent", "Assistant IA", "Asistente IA"],
  agentClose: [
    "Close assistant",
    "Assistent schließen",
    "Fermer l’assistant",
    "Cerrar asistente",
  ],
  agentContext: [
    "Working on this app",
    "Arbeitet an dieser App",
    "Travaille sur cette app",
    "Trabaja en esta app",
  ],
  agentHint: [
    "Describe what you want to change. Review the proposal before applying it to your draft. Your current view stays in place.",
    "Beschreibe, was du ändern möchtest. Prüfe den Vorschlag, bevor du ihn in deinen Entwurf übernimmst. Deine aktuelle Ansicht bleibt erhalten.",
    "Décris le changement souhaité. Vérifie la proposition avant de l’appliquer au brouillon. Ta vue actuelle reste en place.",
    "Describe el cambio. Revisa la propuesta antes de aplicarla al borrador. Tu vista actual se mantiene.",
  ],
  optional: ["Optional", "Optional", "Facultatif", "Opcional"],
  geometry: [
    "Position, size & interaction",
    "Position, Größe & Bedienung",
    "Position, taille et interaction",
    "Posición, tamaño e interacción",
  ],
  globalHeader: [
    "Global header banner",
    "Übergreifender Header-Banner",
    "Bannière globale",
    "Banner global",
  ],
  homeSection: [
    "Shop homepage",
    "Shop-Startseite",
    "Accueil boutique",
    "Inicio de tienda",
  ],
  cartSummary: ["Cart", "Warenkorb", "Panier", "Carrito"],
  checkoutContent: [
    "Checkout · before details",
    "Checkout · vor den Eingaben",
    "Paiement · avant les coordonnées",
    "Checkout · antes de los datos",
  ],
  checkoutSummary: [
    "Checkout · summary",
    "Checkout · Zusammenfassung",
    "Paiement · récapitulatif",
    "Checkout · resumen",
  ],
  accountOverview: [
    "Customer account",
    "Kundenkonto",
    "Compte client",
    "Cuenta del cliente",
  ],
  placementsHint: [
    "Choose up to six places. Each gets an editable view and its own content model. One app can extend the shop and administration together.",
    "Wähle bis zu sechs Bereiche. Jeder erhält eine bearbeitbare Ansicht und ein eigenes Inhaltsmodell. Eine App kann Shop und Verwaltung gemeinsam erweitern.",
    "Choisis jusqu’à six emplacements. Chacun reçoit une vue et un modèle modifiables. Une app peut étendre boutique et administration.",
    "Elige hasta seis zonas. Cada una recibe una vista y un modelo editable. Una app puede ampliar tienda y administración.",
  ],
  designHint: [
    "Drag blocks onto the canvas. Select a block to edit it. Form fields come from its data model; use Preview to enter real test data.",
    "Ziehe Bausteine auf die Arbeitsfläche. Wähle einen Baustein zum Bearbeiten. Formularfelder stammen aus dem Datenmodell; echte Testdaten gibst du in der Vorschau ein.",
    "Glisse les blocs sur la zone. Sélectionne un bloc pour le modifier. Les champs viennent du modèle ; saisis les données dans l’aperçu.",
    "Arrastra bloques al lienzo. Selecciona uno para editarlo. Los campos vienen del modelo; introduce datos reales en la vista previa.",
  ],
  paletteWidth: [
    "Toolbox width",
    "Breite der Bausteinleiste",
    "Largeur des blocs",
    "Ancho de herramientas",
  ],
  inspectorWidth: [
    "Properties width",
    "Breite der Eigenschaften",
    "Largeur des propriétés",
    "Ancho de propiedades",
  ],
  editFields: [
    "Edit form fields",
    "Formularfelder bearbeiten",
    "Modifier les champs",
    "Editar campos",
  ],
  dataSafety: [
    "App data stays in tenant/app-scoped tables with forced row security and tenant-bound indexes. Schema changes require package review; indexes improve declared searches and never expose other shops. Limits: 12 models, 16 fields/model, 100,000 rows and 64 MiB/app. These are shared-database limits, not unlimited scale.",
    "App-Daten bleiben in mandanten- und appgebundenen Tabellen mit erzwungener Zeilensicherheit und mandantengebundenen Indizes. Schemaänderungen erfordern eine Paketprüfung. Indizes beschleunigen deklarierte Suchen und geben keine fremden Shops frei. Grenzen: 12 Modelle, 16 Felder/Modell, 100.000 Zeilen und 64 MiB/App. Das sind Grenzen einer gemeinsamen Datenbank, keine unbegrenzte Skalierung.",
    "Les données restent isolées par boutique/app avec RLS forcée et index par boutique. Les changements exigent une revue. Limites : 12 modèles, 16 champs, 100 000 lignes et 64 Mio/app. La base partagée n’est pas illimitée.",
    "Los datos quedan aislados por tienda/app con RLS forzada e índices por tienda. Los cambios requieren revisión. Límites: 12 modelos, 16 campos, 100.000 filas y 64 MiB/app. La base compartida no es ilimitada.",
  ],
  behavior: [
    "What happens next?",
    "Was passiert danach?",
    "Que se passe-t-il ensuite ?",
    "¿Qué ocurre después?",
  ],
  behaviorHint: [
    "Build the button sequence visually. Server actions keep their permissions. Publish an app event to continue in the existing Flow Builder.",
    "Baue den Ablauf der Schaltfläche grafisch. Serveraktionen behalten ihre Rechte. Ein App-Ereignis führt im bestehenden Flow Builder weiter.",
    "Construis la séquence visuellement. Les actions gardent leurs droits. Un événement d’app peut continuer dans le Flow Builder.",
    "Construye la secuencia visualmente. Las acciones mantienen sus permisos. Un evento continúa en el Flow Builder.",
  ],
  validate: [
    "Check form",
    "Formular prüfen",
    "Vérifier le formulaire",
    "Validar formulario",
  ],
  call: [
    "Run app action",
    "App-Aktion ausführen",
    "Exécuter une action",
    "Ejecutar acción",
  ],
  refresh: [
    "Reload content",
    "Inhalt aktualisieren",
    "Actualiser le contenu",
    "Actualizar contenido",
  ],
  msgBox: [
    "Show message",
    "Nachricht anzeigen",
    "Afficher un message",
    "Mostrar mensaje",
  ],
  navigate: ["Open view", "Ansicht öffnen", "Ouvrir une vue", "Abrir vista"],
  set: [
    "Set field value",
    "Feldwert setzen",
    "Définir un champ",
    "Asignar valor",
  ],
  if: [
    "Check condition",
    "Bedingung prüfen",
    "Vérifier condition",
    "Comprobar condición",
  ],
  settings: [
    "App settings",
    "App-Einstellungen",
    "Paramètres de l’app",
    "Ajustes de la app",
  ],
  connectionsHint: [
    "Decide where your app appears, which actions it offers, and how events start automations. Advanced service modules stay separate.",
    "Lege fest, wo deine App erscheint, welche Aktionen sie anbietet und wie Ereignisse Automatisierungen starten. Erweiterte Servicemodule bleiben getrennt.",
    "Définis les vues, actions et événements de ton app. Les modules de service avancés restent séparés.",
    "Define vistas, acciones y eventos. Los módulos de servicio avanzados quedan separados.",
  ],
} as const;
export function useAppWorkspaceText() {
  const { locale } = useLocale();
  return (k: keyof typeof workspaceWords) =>
    workspaceWords[k][
      { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]
    ];
}
