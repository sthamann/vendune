/** Shared native lifecycle editor vocabulary; state labels remain merchant content. */
import { useLocale } from "./i18n";
export const lifecycleWords = {
  title: [
    "Order & quote workflows",
    "Bestell- & Angebotsabläufe",
    "Workflows commandes et devis",
    "Flujos de pedidos y presupuestos",
  ],
  hint: [
    "Add review steps to native workflows. Each new order or quote keeps its accepted app version; payment, inventory and buyer approval remain native. Name every new step and action in the shop main language before saving.",
    "Ergänze Prüfschritte im normalen Ablauf. Jede neue Bestellung und Anfrage behält ihre angenommene App-Version; Zahlung, Bestand und Käuferfreigabe bleiben verbindlich. Benenne alle neuen Schritte und Aktionen vor dem Speichern in der Hauptsprache des Shops.",
    "Ajoute des étapes de contrôle. Chaque commande ou devis conserve sa version acceptée ; paiement, stock et accord acheteur restent natifs. Nomme chaque étape et action dans la langue principale de la boutique avant de sauvegarder.",
    "Añade pasos de revisión. Cada pedido o presupuesto conserva su versión aceptada; pago, inventario y aprobación siguen siendo nativos. Nombra cada paso y acción en el idioma principal de la tienda antes de guardar.",
  ],
  order: ["Order", "Bestellung", "Commande", "Pedido"],
  quote: [
    "Quote request",
    "Angebotsanfrage",
    "Demande de devis",
    "Solicitud de presupuesto",
  ],
  add: [
    "Add a review workflow",
    "Prüfablauf hinzufügen",
    "Ajouter un contrôle",
    "Añadir revisión",
  ],
  state: [
    "Review step",
    "Prüfschritt",
    "Étape de contrôle",
    "Paso de revisión",
  ],
  addState: [
    "Add a step",
    "Schritt hinzufügen",
    "Ajouter une étape",
    "Añadir paso",
  ],
  transition: [
    "Next step",
    "Nächster Schritt",
    "Étape suivante",
    "Paso siguiente",
  ],
  addTransition: [
    "Connect steps",
    "Schritte verbinden",
    "Relier les étapes",
    "Conectar pasos",
  ],
  cancel: [
    "Cancel order",
    "Bestellung stornieren",
    "Annuler commande",
    "Cancelar pedido",
  ],
  from: ["From", "Von", "De", "Desde"],
  to: ["To", "Nach", "Vers", "Hasta"],
  caption: [
    "Button label",
    "Schaltflächentext",
    "Texte du bouton",
    "Texto del botón",
  ],
  id: ["Technical ID", "Technische ID", "ID technique", "ID técnico"],
  remove: ["Remove", "Entfernen", "Supprimer", "Eliminar"],
  keep: [
    "Keep native steps",
    "Native Schritte beibehalten",
    "Conserver étapes natives",
    "Mantener pasos nativos",
  ],
  replace: [
    "Insert instead of",
    "Einfügen anstelle von",
    "Insérer à la place de",
    "Insertar en lugar de",
  ],
  start: [
    "Start processing",
    "Bearbeitung starten",
    "Commencer traitement",
    "Iniciar gestión",
  ],
  complete: [
    "Complete order",
    "Bestellung abschließen",
    "Terminer commande",
    "Completar pedido",
  ],
  permissions: [
    "Additional permissions",
    "Zusätzliche Berechtigungen",
    "Autorisations supplémentaires",
    "Permisos adicionales",
  ],
  "payment.ready": [
    "Payment ready",
    "Zahlung bestätigt",
    "Paiement confirmé",
    "Pago confirmado",
  ],
  "delivery.delivered": [
    "All shipments delivered",
    "Alle Lieferungen zugestellt",
    "Toutes livraisons reçues",
    "Todas las entregas recibidas",
  ],
  "quote.message": [
    "Buyer supplied a request",
    "Käufer hat eine Anfrage beschrieben",
    "Demande acheteur présente",
    "Solicitud del comprador presente",
  ],
} as const;
export function useLifecycleText() {
  const { locale } = useLocale();
  return (key: keyof typeof lifecycleWords) =>
    lifecycleWords[key][
      { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]
    ];
}

export const lifecycleOperationWords = {
  lifecyclePermission: [
    "Additional permission required",
    "Zusätzliche Berechtigung erforderlich",
    "Autorisation supplémentaire requise",
    "Se necesita permiso adicional",
  ],
  lifecycleGuard: [
    "The app’s transition checks are not satisfied",
    "Die Übergangsprüfungen der App sind noch nicht erfüllt",
    "Les contrôles de transition ne sont pas satisfaits",
    "No se cumplen las comprobaciones de transición",
  ],
  "commerce.lifecycle": [
    "Extend native order and quote workflows",
    "Bestell- und Angebotsabläufe erweitern",
    "Étendre les workflows commandes et devis",
    "Ampliar flujos de pedidos y presupuestos",
  ],
} as const;

export const lifecycleValidationErrors: Record<string, readonly string[]> = {
  "Lifecycle actions require short unique IDs and translated labels": [
    "A workflow action has an invalid identifier or missing label. Use a unique ID of up to 16 characters and name the action in the shop main language. Your app is unchanged.",
    "Eine Ablaufaktion hat eine ungültige Kennung oder keinen Namen. Verwende eine eindeutige Kennung mit höchstens 16 Zeichen und benenne die Aktion in der Shop-Hauptsprache. Deine App bleibt unverändert.",
    "Une action a un identifiant invalide ou un libellé absent. Utilisez un identifiant unique de 16 caractères maximum et nommez l’action dans la langue principale. L’app reste inchangée.",
    "Una acción tiene un identificador inválido o no tiene nombre. Usa un ID único de hasta 16 caracteres y nombra la acción en el idioma principal. La app no ha cambiado.",
  ],
  "Unknown native lifecycle permission": [
    "This workflow requests an unknown team permission. Select an existing permission under Connections → Order & quote workflows. Your app is unchanged.",
    "Dieser Ablauf verlangt ein unbekanntes Teamrecht. Wähle ein vorhandenes Recht unter Verbindungen → Bestell- & Angebotsabläufe. Deine App bleibt unverändert.",
    "Ce workflow demande une autorisation inconnue. Choisissez une autorisation existante dans Connexions → Workflows commandes et devis. L’app reste inchangée.",
    "Este flujo solicita un permiso desconocido. Selecciona un permiso existente en Conexiones → Flujos de pedidos y presupuestos. La app no ha cambiado.",
  ],
  "Unsupported guard for this native lifecycle": [
    "This check is unavailable for this workflow. Orders support confirmed payment and delivered shipments; quote requests support a buyer message. Your app is unchanged.",
    "Diese Bedingung ist für diesen Ablauf nicht verfügbar. Bestellungen unterstützen bestätigte Zahlungen und zugestellte Lieferungen; Angebotsanfragen eine vorhandene Käufernachricht. Deine App bleibt unverändert.",
    "Ce contrôle ne convient pas à ce workflow. Commandes : paiement confirmé et livraison ; devis : message acheteur présent. L’app reste inchangée.",
    "Esta condición no está disponible. Pedidos: pago confirmado y entregas recibidas; presupuestos: mensaje del comprador. La app no ha cambiado.",
  ],
  "Unsupported native lifecycle transition": [
    "This transition bypasses a native step. Quote review must return to the request or reject it; it cannot replace native actions or accept an offer. Review the connections; your app is unchanged.",
    "Dieser Übergang überspringt einen verbindlichen Schritt. Eine Angebotsprüfung muss zur Anfrage zurückführen oder sie ablehnen; sie darf keine nativen Aktionen ersetzen oder Angebote annehmen. Prüfe die Verbindungen; deine App bleibt unverändert.",
    "Cette transition contourne une étape native. Un contrôle de devis revient à la demande ou la rejette ; il ne remplace pas les actions natives et n’accepte pas d’offre. L’app reste inchangée.",
    "Esta transición omite un paso nativo. La revisión vuelve a la solicitud o la rechaza; no puede sustituir acciones nativas ni aceptar ofertas. La app no ha cambiado.",
  ],
};
