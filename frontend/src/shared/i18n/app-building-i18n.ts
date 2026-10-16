/** Shared translated app recipes and reviewed AI changes; no alternate app schema. */
import { useLocale } from "./i18n";
export const buildingWords = {
  furniture: [
    "Configurable furniture",
    "Möbel konfigurieren",
    "Meubles configurables",
    "Muebles configurables",
  ],
  furnitureHint: [
    "Materials, dimensions, checked surcharges, purchasing approval and saved-list reorder.",
    "Materialien, Maße, geprüfte Zuschläge, Einkaufsfreigabe und Nachbestellung aus Bestelllisten.",
    "Matériaux, dimensions, suppléments vérifiés, approbation et nouvelle commande depuis les listes.",
    "Materiales, medidas, recargos validados, aprobación y repetición desde listas.",
  ],
  edi: ["EDI procurement", "EDI-Beschaffung", "Achats EDI", "Compras EDI"],
  ediHint: [
    "Map partners, validate documents and import purchase lists through an independent Rust app.",
    "Partner zuordnen, Dokumente prüfen und Bestelllisten über eine eigenständige Rust-App importieren.",
    "Associez des partenaires, validez les documents et importez les listes via une application Rust indépendante.",
    "Configura socios, valida documentos e importa listas mediante una aplicación Rust independiente.",
  ],
  reviewTranslations: [
    "Review translation drafts",
    "Übersetzungsentwürfe prüfen",
    "Vérifier les traductions",
    "Revisar traducciones",
  ],
  translationDrafts: [
    "Catalogue translation drafts",
    "Katalog-Übersetzungsentwürfe",
    "Brouillons de traduction du catalogue",
    "Borradores de traducción del catálogo",
  ],
  translationBoundary: [
    "Queues missing translations for the entire catalogue. Review and apply them in Settings → Languages. Existing translations remain unchanged; products keep their version history and restore controls.",
    "Erstellt fehlende Übersetzungsentwürfe für den gesamten Katalog. Unter Einstellungen → Sprachen prüfen und übernehmen. Bestehende Übersetzungen bleiben erhalten; die Produkthistorie erlaubt die Wiederherstellung.",
    "Prépare les traductions manquantes de tout le catalogue. Vérifiez et appliquez-les dans Paramètres → Langues. Les traductions existantes sont conservées; l’historique produit permet la restauration.",
    "Prepara las traducciones que faltan de todo el catálogo. Revisa y aplica en Ajustes → Idiomas. Se conservan las traducciones existentes y el historial permite restaurar.",
  ],
  personalizationWhy: [
    "Why this order?",
    "Warum diese Reihenfolge?",
    "Pourquoi cet ordre ?",
    "¿Por qué este orden?",
  ],
  personalizationExplanation: [
    "With your permission, product views and additions to this cart favor related categories. Prices stay the same. This is an observed preference, not proof of better results. You can disable personalization in Privacy settings.",
    "Mit deiner Zustimmung bevorzugen Produktansichten und Ergänzungen dieses Warenkorbs verwandte Kategorien. Preise bleiben gleich. Das ist eine beobachtete Vorliebe, kein Nachweis besserer Ergebnisse. Du kannst die Personalisierung in den Datenschutzeinstellungen ausschalten.",
    "Avec votre consentement, les produits consultés et ajoutés à ce panier favorisent les catégories proches. Les prix restent identiques. Il s’agit d’une préférence observée, pas d’une preuve de meilleurs résultats. Désactivez la personnalisation dans les paramètres de confidentialité.",
    "Con tu permiso, las visitas y adiciones a este carrito favorecen categorías relacionadas. Los precios no cambian. Es una preferencia observada, no una prueba de mejores resultados. Puedes desactivarla en Privacidad.",
  ],
  formPrompt: [
    "Build a master-detail editor with native inputs, a list, a record form and a validated save button for this app. Keep existing data and permissions.",
    "Baue für diese App einen Master-Detail-Editor mit nativen Eingaben, Liste, Datensatzformular und validiertem Speichern. Erhalte Daten und Rechte.",
    "Construis un éditeur maître-détail avec saisies natives, liste, formulaire et sauvegarde validée. Conserve les données et droits.",
    "Crea un editor maestro-detalle con controles nativos, lista, formulario y guardado validado. Conserva datos y permisos.",
  ],
  validationPrompt: [
    "Improve validation, translated help and accessible field labels in this app. Keep its identity, data bindings and access rules.",
    "Verbessere Validierung, übersetzte Hilfen und zugängliche Feldbeschriftungen dieser App. Erhalte Identität, Datenbindungen und Rechte.",
    "Améliore la validation, les aides traduites et les libellés accessibles. Conserve l’identité, les liaisons et les droits.",
    "Mejora validación, ayuda traducida y etiquetas accesibles. Conserva identidad, enlaces y permisos.",
  ],
  formIdea: [
    "Build the editor",
    "Editor aufbauen",
    "Créer l’éditeur",
    "Crear el editor",
  ],
  validationIdea: [
    "Improve the details",
    "Details verbessern",
    "Améliorer les détails",
    "Mejorar los detalles",
  ],
  recipes: [
    "Start with a working pattern",
    "Mit einem funktionierenden Muster starten",
    "Partir d’un modèle fonctionnel",
    "Empezar con un patrón funcional",
  ],
  recipeHint: [
    "Choose, edit, press F5. Every pattern uses the same data, permissions and API as your app.",
    "Auswählen, bearbeiten, F5 drücken. Jedes Muster nutzt dieselben Daten, Rechte und APIs wie deine App.",
    "Choisissez, modifiez, appuyez sur F5. Chaque modèle utilise les mêmes données, droits et API.",
    "Elige, edita y pulsa F5. Cada patrón usa los mismos datos, permisos y API.",
  ],
  advisor: [
    "Product advisor",
    "Produktberater",
    "Conseiller produit",
    "Asesor de productos",
  ],
  advisorHint: [
    "Product-bound advice: private editor, public product card, API and optional AI access.",
    "Produktbezogene Beratung: privater Editor, öffentliche Produktkarte, API und optionaler KI-Zugriff.",
    "Conseils liés au produit : éditeur privé, fiche publique, API et accès IA facultatif.",
    "Consejos por producto: editor privado, tarjeta pública, API y acceso IA opcional.",
  ],
  returns: [
    "Returns workspace",
    "Retouren-Arbeitsbereich",
    "Gestion des retours",
    "Gestión de devoluciones",
  ],
  returnsHint: [
    "Order-bound cases with reason, status and internal notes. Refunds stay in Payments.",
    "Bestellbezogene Fälle mit Grund, Status und internen Notizen. Erstattungen bleiben im Zahlungsdienst.",
    "Dossiers liés aux commandes : motif, statut et notes. Les remboursements restent dans le service de paiement.",
    "Casos por pedido con motivo, estado y notas. Los reembolsos siguen en Pagos.",
  ],
  erp: ["ERP handoff", "ERP-Anbindung", "Connexion ERP", "Conexión ERP"],
  erpHint: [
    "Event-driven connector contract. The external ERP service must be deployed separately.",
    "Ereignisbasierter Anschlussvertrag. Der externe ERP-Dienst muss separat bereitgestellt werden.",
    "Contrat événementiel. Le service ERP externe doit être déployé séparément.",
    "Contrato basado en eventos. El servicio ERP externo requiere despliegue separado.",
  ],
  contact: [
    "Reason / advice",
    "Grund / Empfehlung",
    "Motif / conseil",
    "Motivo / consejo",
  ],
  notes: [
    "Internal notes",
    "Interne Notizen",
    "Notes internes",
    "Notas internas",
  ],
  status: ["Status", "Status", "Statut", "Estado"],
  new: ["New", "Neu", "Nouveau", "Nuevo"],
  review: ["Under review", "In Prüfung", "En cours", "En revisión"],
  closed: ["Closed", "Abgeschlossen", "Terminé", "Cerrado"],
  buildPath: [
    "Design → F5 preview → save version → staging → selected release",
    "Gestalten → F5-Vorschau → Version speichern → Staging → gezielter Release",
    "Concevoir → aperçu F5 → version → staging → publication ciblée",
    "Diseñar → vista F5 → versión → staging → publicación selectiva",
  ],
  proposal: [
    "Review the AI proposal",
    "KI-Vorschlag prüfen",
    "Vérifier la proposition IA",
    "Revisar propuesta de IA",
  ],
  proposalHint: [
    "Your current canvas is unchanged. Check data, interfaces and access before accepting this version.",
    "Deine Arbeitsfläche ist unverändert. Prüfe Daten, Oberflächen und Zugriff, bevor du diese Version übernimmst.",
    "Le canevas reste inchangé. Vérifiez données, interfaces et accès avant d’accepter.",
    "El lienzo no cambia. Revisa datos, interfaces y acceso antes de aceptar.",
  ],
  accept: [
    "Use this proposal",
    "Diesen Vorschlag übernehmen",
    "Utiliser cette proposition",
    "Usar esta propuesta",
  ],
  discard: [
    "Keep my current draft",
    "Meinen Entwurf behalten",
    "Conserver mon brouillon",
    "Conservar mi borrador",
  ],
  conflict: [
    "The draft changed while AI was working. Keep it or generate a fresh proposal.",
    "Der Entwurf wurde während der KI-Erstellung geändert. Behalte ihn oder erzeuge einen neuen Vorschlag.",
    "Le brouillon a changé pendant la génération. Conservez-le ou générez une nouvelle proposition.",
    "El borrador cambió durante la generación. Consérvalo o genera una nueva propuesta.",
  ],
  models: [
    "Data models",
    "Datenmodelle",
    "Modèles de données",
    "Modelos de datos",
  ],
  surfaces: ["Interfaces", "Oberflächen", "Interfaces", "Interfaces"],
  access: [
    "Permissions and public access",
    "Berechtigungen und öffentlicher Zugriff",
    "Permissions et accès public",
    "Permisos y acceso público",
  ],
  added: ["Added", "Hinzugefügt", "Ajouté", "Añadido"],
  changed: ["Changed", "Geändert", "Modifié", "Modificado"],
  removed: ["Removed", "Entfernt", "Supprimé", "Eliminado"],
  noChanges: [
    "No structural changes",
    "Keine strukturellen Änderungen",
    "Aucun changement structurel",
    "Sin cambios estructurales",
  ],
} as const;
export type BuildingKey = keyof typeof buildingWords;
export function buildingText(key: BuildingKey) {
  const v = buildingWords[key];
  return { en: v[0], de: v[1], fr: v[2], es: v[3] };
}
export function useBuildingText() {
  const { locale } = useLocale();
  const i = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: BuildingKey) => buildingWords[key][i];
}
