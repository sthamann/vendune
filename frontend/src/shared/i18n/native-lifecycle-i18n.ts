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
