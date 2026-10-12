/** POS vocabulary: one shared four-language catalogue, with the Studio locale. */
import { useLocale } from "../../shared/i18n/i18n";
import { cashierWords } from "./cashier-i18n";
export const posWords = {
  ...cashierWords,
  catalog: ["Products", "Produkte", "Produits", "Productos"],
  paymentRefresh: [
    "Check payment",
    "Zahlung prüfen",
    "Vérifier le paiement",
    "Comprobar pago",
  ],
  currency: [
    "Sale currency",
    "Verkaufswährung",
    "Devise de vente",
    "Moneda de venta",
  ],
  coupon: [
    "Coupon codes",
    "Gutscheincodes",
    "Codes promotionnels",
    "Códigos de cupón",
  ],
  apply: ["Apply", "Anwenden", "Appliquer", "Aplicar"],
  closed: [
    "This sale is already closed. Start a new sale.",
    "Dieser Verkauf ist bereits abgeschlossen. Beginne einen neuen Verkauf.",
    "Cette vente est clôturée. Commencez une nouvelle vente.",
    "Esta venta ya está cerrada. Inicia una nueva venta.",
  ],
  variants: [
    "Choose variant",
    "Variante wählen",
    "Choisir une variante",
    "Elegir variante",
  ],
  close: ["Close", "Schließen", "Fermer", "Cerrar"],
  title: ["Point of sale", "Kasse", "Point de vente", "Punto de venta"],
  hint: [
    "One catalog. Every sale connected.",
    "Ein Katalog. Jeder Verkauf verbunden.",
    "Un catalogue. Toutes les ventes connectées.",
    "Un catálogo. Cada venta conectada.",
  ],
  choose: [
    "Choose register",
    "Kasse wählen",
    "Choisir une caisse",
    "Elegir caja",
  ],
  empty: [
    "Create a POS sales channel to open your first register.",
    "Lege einen POS-Verkaufskanal an, um die erste Kasse zu öffnen.",
    "Créez un canal POS pour ouvrir votre première caisse.",
    "Crea un canal POS para abrir tu primera caja.",
  ],
  setup: [
    "Manage sales channels",
    "Verkaufskanäle verwalten",
    "Gérer les canaux de vente",
    "Gestionar canales",
  ],
  search: [
    "Search products or scan a barcode",
    "Produkte suchen oder Barcode scannen",
    "Rechercher ou scanner un code-barres",
    "Buscar productos o escanear código",
  ],
  scan: ["Scan", "Scannen", "Scanner", "Escanear"],
  cart: ["Current sale", "Aktueller Verkauf", "Vente actuelle", "Venta actual"],
  add: [
    "Add product",
    "Produkt hinzufügen",
    "Ajouter le produit",
    "Añadir producto",
  ],
  remove: ["Remove", "Entfernen", "Supprimer", "Eliminar"],
  nothing: [
    "Ready for your next customer",
    "Bereit für den nächsten Kunden",
    "Prêt pour votre prochain client",
    "Listo para tu próximo cliente",
  ],
  hold: ["Hold sale", "Verkauf parken", "Mettre en attente", "Guardar venta"],
  held: [
    "Held sales",
    "Geparkte Verkäufe",
    "Ventes en attente",
    "Ventas guardadas",
  ],
  resume: ["Resume", "Fortsetzen", "Reprendre", "Continuar"],
  payment: [
    "Payment method",
    "Zahlungsart",
    "Moyen de paiement",
    "Método de pago",
  ],
  cash: [
    "Cash received",
    "Erhaltenes Bargeld",
    "Espèces reçues",
    "Efectivo recibido",
  ],
  exact: ["Exact amount", "Passend bezahlt", "Montant exact", "Importe exacto"],
  change: ["Change", "Wechselgeld", "Monnaie à rendre", "Cambio"],
  pay: [
    "Complete sale",
    "Verkauf abschließen",
    "Finaliser la vente",
    "Completar venta",
  ],
  busy: ["Saving…", "Wird gespeichert…", "Enregistrement…", "Guardando…"],
  total: ["Total", "Gesamt", "Total", "Total"],
  subtotal: ["Items", "Positionen", "Articles", "Artículos"],
  tax: [
    "Included tax",
    "Enthaltene Steuer",
    "Taxes incluses",
    "Impuestos incluidos",
  ],
  done: [
    "Sale recorded",
    "Verkauf erfasst",
    "Vente enregistrée",
    "Venta registrada",
  ],
  paid: [
    "Cash payment confirmed",
    "Barzahlung bestätigt",
    "Paiement en espèces confirmé",
    "Pago en efectivo confirmado",
  ],
  pending: [
    "Payment awaits confirmation",
    "Zahlung wartet auf Bestätigung",
    "Paiement en attente de confirmation",
    "Pago pendiente de confirmación",
  ],
  next: [
    "Next customer",
    "Nächster Kunde",
    "Client suivant",
    "Siguiente cliente",
  ],
  receipt: [
    "Create receipt",
    "Beleg erstellen",
    "Créer un justificatif",
    "Crear comprobante",
  ],
  print: [
    "Open PDF receipt",
    "PDF-Beleg öffnen",
    "Ouvrir le justificatif PDF",
    "Abrir comprobante PDF",
  ],
  recent: [
    "Recent sales",
    "Letzte Verkäufe",
    "Dernières ventes",
    "Ventas recientes",
  ],
  order: ["View order", "Bestellung ansehen", "Voir la commande", "Ver pedido"],
  contact: [
    "Customer & billing details (optional for cash)",
    "Kunden- und Rechnungsdaten (optional bei Barzahlung)",
    "Coordonnées et facturation (facultatif en espèces)",
    "Cliente y facturación (opcional en efectivo)",
  ],
  email: ["Email", "E-Mail", "E-mail", "Correo"],
  first: ["First name", "Vorname", "Prénom", "Nombre"],
  last: ["Last name", "Nachname", "Nom", "Apellido"],
  street: [
    "Street and number",
    "Straße und Hausnummer",
    "Rue et numéro",
    "Calle y número",
  ],
  postal: ["Postal code", "Postleitzahl", "Code postal", "Código postal"],
  city: ["City", "Stadt", "Ville", "Ciudad"],
  save: [
    "Apply details",
    "Daten übernehmen",
    "Appliquer les coordonnées",
    "Aplicar datos",
  ],
  terms: [
    "Customer accepts the current terms",
    "Kunde akzeptiert die aktuellen Bedingungen",
    "Le client accepte les conditions actuelles",
    "El cliente acepta las condiciones actuales",
  ],
  digital: [
    "Customer requests immediate digital delivery",
    "Kunde wünscht sofortige digitale Bereitstellung",
    "Le client demande la livraison numérique immédiate",
    "El cliente solicita entrega digital inmediata",
  ],
  online: [
    "Online register · sales require a connection",
    "Online-Kasse · Verkäufe benötigen eine Verbindung",
    "Caisse en ligne · connexion nécessaire",
    "Caja en línea · conexión necesaria",
  ],
  unavailable: [
    "No products found",
    "Keine Produkte gefunden",
    "Aucun produit trouvé",
    "No se encontraron productos",
  ],
  more: ["Load more", "Mehr laden", "Charger plus", "Cargar más"],
  country: [
    "Store location country",
    "Land des Kassenstandorts",
    "Pays du point de vente",
    "País de la tienda",
  ],
  columns: [
    "Product columns",
    "Produktspalten",
    "Colonnes de produits",
    "Columnas de productos",
  ],
  compact: [
    "Compact product cards",
    "Kompakte Produktkarten",
    "Fiches produits compactes",
    "Tarjetas compactas",
  ],
  message: [
    "Receipt message",
    "Belegnachricht",
    "Message du justificatif",
    "Mensaje del comprobante",
  ],
  posHint: [
    "Touch register with shared inventory, orders, receipts and app extensions. Cash is enabled on this channel only.",
    "Touch-Kasse mit gemeinsamen Beständen, Bestellungen, Belegen und App-Erweiterungen. Barzahlung wird nur für diesen Kanal aktiviert.",
    "Caisse tactile avec stocks, commandes, justificatifs et apps partagés. Espèces activées uniquement ici.",
    "Caja táctil con inventario, pedidos, comprobantes y apps compartidos. Efectivo solo en este canal.",
  ],
  permission: [
    "Your role needs POS and order write permissions.",
    "Deine Rolle benötigt Kassen- und Bestellschreibrechte.",
    "Votre rôle nécessite les droits POS et d’écriture des commandes.",
    "Tu rol necesita permisos POS y escritura de pedidos.",
  ],
  connection: [
    "Recover current sale",
    "Aktuellen Verkauf wiederherstellen",
    "Récupérer la vente actuelle",
    "Recuperar venta actual",
  ],
  paymentContinue: [
    "Continue payment",
    "Zahlung fortsetzen",
    "Continuer le paiement",
    "Continuar pago",
  ],
} as const;
export type PosWord = keyof typeof posWords;
export function usePosText() {
  const { locale } = useLocale();
  const i = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: PosWord) => posWords[key][i];
}
