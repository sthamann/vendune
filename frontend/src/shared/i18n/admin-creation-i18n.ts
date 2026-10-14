/** Shared settings navigation and native customer/manual-order creation vocabulary: EN/DE/FR/ES. */
import { useLocale } from "./i18n";
export const adminCreationWords = {
  customerSearch: [
    "Search customer name, email or number",
    "Kundenname, E-Mail oder Nummer suchen",
    "Rechercher nom, email ou numéro client",
    "Buscar nombre, correo o número de cliente",
  ],
  customerLoading: [
    "Searching customers…",
    "Kunden werden gesucht …",
    "Recherche des clients…",
    "Buscando clientes…",
  ],
  noCustomers: [
    "No matching customers",
    "Keine passenden Kunden",
    "Aucun client trouvé",
    "No hay clientes coincidentes",
  ],
  selectCustomer: [
    "Select customer",
    "Kunden auswählen",
    "Choisir un client",
    "Seleccionar cliente",
  ],
  changeCustomer: [
    "Choose another customer",
    "Anderen Kunden auswählen",
    "Choisir un autre client",
    "Elegir otro cliente",
  ],

  channelsHint: [
    "Domains, storefronts and channel overrides",
    "Domains, Shop-Oberflächen und Kanalabweichungen",
    "Domaines, vitrines et réglages par canal",
    "Dominios, escaparates y ajustes por canal",
  ],
  appsHint: [
    "Extensions, installed apps and connected services",
    "Erweiterungen, installierte Apps und verbundene Dienste",
    "Extensions, applications installées et services connectés",
    "Extensiones, aplicaciones instaladas y servicios conectados",
  ],
  apps: ["Apps", "Apps", "Applications", "Aplicaciones"],
  basics: [
    "Shop foundations",
    "Shop-Grundlagen",
    "Fondations de la boutique",
    "Base de la tienda",
  ],
  markets: [
    "Markets & pricing",
    "Märkte & Preise",
    "Marchés et prix",
    "Mercados y precios",
  ],
  checkout: [
    "Checkout & fulfillment",
    "Checkout & Abwicklung",
    "Paiement et livraison",
    "Pago y entrega",
  ],
  customers: [
    "Customers & business",
    "Kunden & Geschäft",
    "Clients et entreprises",
    "Clientes y empresas",
  ],
  searchSettings: [
    "Find a setting",
    "Einstellung finden",
    "Trouver un réglage",
    "Buscar un ajuste",
  ],
  noSettings: [
    "No matching settings. Try a different search.",
    "Keine passende Einstellung. Ändere die Suche.",
    "Aucun réglage correspondant. Modifiez la recherche.",
    "No hay ajustes coincidentes. Cambia la búsqueda.",
  ],
  newCustomer: [
    "Add customer",
    "Kunde anlegen",
    "Ajouter un client",
    "Añadir cliente",
  ],
  newOrder: [
    "Create order",
    "Bestellung anlegen",
    "Créer une commande",
    "Crear pedido",
  ],
  customerHint: [
    "Create a customer profile with billing and shipping defaults. This does not create a password or grant storefront access.",
    "Lege ein Kundenprofil mit Standard-Rechnungs- und Lieferadresse an. Dabei wird kein Passwort vergeben und kein Shop-Zugang freigeschaltet.",
    "Créez un profil avec les adresses par défaut. Aucun mot de passe ni accès à la boutique n’est attribué.",
    "Crea un perfil con direcciones predeterminadas. No se asigna contraseña ni acceso a la tienda.",
  ],
  orderHint: [
    "Build an order for a customer. Veyndo calculates prices, discounts, tax and stock through the same checkout as your shop.",
    "Stelle eine Bestellung für einen Kunden zusammen. Veyndo berechnet Preise, Rabatte, Steuern und Bestand über denselben Checkout wie dein Shop.",
    "Préparez une commande. Veyndo utilise le même paiement pour les prix, remises, taxes et stocks.",
    "Prepara un pedido. Veyndo calcula precios, descuentos, impuestos y existencias con el mismo proceso de tu tienda.",
  ],
  contact: [
    "Contact & customer group",
    "Kontakt & Kundengruppe",
    "Contact et groupe de clients",
    "Contacto y grupo de clientes",
  ],
  billing: [
    "Billing address",
    "Rechnungsadresse",
    "Adresse de facturation",
    "Dirección de facturación",
  ],
  shipping: [
    "Shipping address",
    "Lieferadresse",
    "Adresse de livraison",
    "Dirección de envío",
  ],
  sameAddress: [
    "Use billing address for shipping",
    "Rechnungsadresse auch als Lieferadresse",
    "Utiliser l’adresse de facturation pour la livraison",
    "Usar facturación para el envío",
  ],
  cancel: [
    "Back to overview",
    "Zur Übersicht",
    "Retour à la liste",
    "Volver a la lista",
  ],
  saveCustomer: [
    "Save customer",
    "Kunde speichern",
    "Enregistrer le client",
    "Guardar cliente",
  ],
  pending: [
    "You have unsaved changes",
    "Du hast ungespeicherte Änderungen",
    "Modifications non enregistrées",
    "Tienes cambios sin guardar",
  ],
  keep: [
    "Keep editing",
    "Weiter bearbeiten",
    "Continuer à modifier",
    "Seguir editando",
  ],
  discard: [
    "Discard changes",
    "Änderungen verwerfen",
    "Annuler les modifications",
    "Descartar cambios",
  ],
  busy: ["Saving…", "Wird gespeichert…", "Enregistrement…", "Guardando…"],
  configuration: [
    "Sales channel & order language",
    "Verkaufskanal & Bestellsprache",
    "Canal de vente et langue",
    "Canal de ventas e idioma",
  ],
  channel: [
    "Sales channel",
    "Verkaufskanal",
    "Canal de vente",
    "Canal de ventas",
  ],
  language: [
    "Order language",
    "Bestellsprache",
    "Langue de commande",
    "Idioma del pedido",
  ],
  currency: [
    "Order currency",
    "Bestellwährung",
    "Devise de commande",
    "Moneda del pedido",
  ],
  customer: [
    "Select a customer",
    "Kunden auswählen",
    "Sélectionner un client",
    "Seleccionar cliente",
  ],
  products: [
    "Add products",
    "Produkte hinzufügen",
    "Ajouter des produits",
    "Añadir productos",
  ],
  productSearch: [
    "Search products or SKU",
    "Produkte oder Artikelnummer suchen",
    "Rechercher produits ou références",
    "Buscar productos o referencia",
  ],
  noProducts: [
    "No products found",
    "Keine Produkte gefunden",
    "Aucun produit trouvé",
    "No se encontraron productos",
  ],
  add: ["Add", "Hinzufügen", "Ajouter", "Añadir"],
  remove: ["Remove", "Entfernen", "Retirer", "Quitar"],
  quantity: ["Quantity", "Menge", "Quantité", "Cantidad"],
  methods: [
    "Delivery & payment",
    "Versand & Zahlung",
    "Livraison et paiement",
    "Envío y pago",
  ],
  coupons: [
    "Coupon codes, separated by commas",
    "Gutscheincodes, durch Kommas getrennt",
    "Codes de remise séparés par des virgules",
    "Códigos separados por comas",
  ],
  paymentHint: [
    "Manual payments remain pending. Simulated payments are demo payments. Real provider payments must be completed by the buyer.",
    "Manuelle Zahlungen bleiben offen. Simulierte Zahlungen sind Demozahlungen. Echte Anbieterzahlungen müssen vom Käufer abgeschlossen werden.",
    "Les paiements manuels restent en attente. Les paiements simulés sont des démonstrations. Le client doit terminer les paiements réels.",
    "Los pagos manuales quedan pendientes y los simulados son de demostración. El comprador debe completar los pagos reales.",
  ],
  review: [
    "Review order",
    "Bestellung prüfen",
    "Vérifier la commande",
    "Revisar pedido",
  ],
  reviewed: [
    "Ready for your review",
    "Bereit für deine Prüfung",
    "Prête à vérifier",
    "Lista para revisar",
  ],
  edit: [
    "Edit order",
    "Bestellung bearbeiten",
    "Modifier la commande",
    "Editar pedido",
  ],
  items: ["Products", "Produkte", "Produits", "Productos"],
  tax: [
    "Included tax",
    "Enthaltene Steuer",
    "Taxe incluse",
    "Impuestos incluidos",
  ],
  delivery: ["Delivery", "Versand", "Livraison", "Envío"],
  total: ["Total", "Gesamt", "Total", "Total"],
  authorization: [
    "The customer authorized this order and I have checked the addresses, products and payment method.",
    "Der Kunde hat diese Bestellung autorisiert. Ich habe Adressen, Produkte und Zahlungsart geprüft.",
    "Le client a autorisé cette commande et j’ai vérifié adresses, produits et paiement.",
    "El cliente autorizó este pedido y he revisado direcciones, productos y pago.",
  ],
  terms: [
    "The customer's acceptance of the current terms has been obtained.",
    "Die Zustimmung des Kunden zu den aktuellen Bedingungen liegt vor.",
    "Le consentement du client aux conditions actuelles a été obtenu.",
    "Se ha obtenido la aceptación del cliente de las condiciones actuales.",
  ],
  digital: [
    "The customer expressly requested immediate digital delivery and acknowledged the consequences.",
    "Der Kunde hat die sofortige digitale Bereitstellung ausdrücklich verlangt und die Folgen bestätigt.",
    "Le client a demandé la livraison numérique immédiate et accepté les conséquences.",
    "El cliente solicitó expresamente la entrega digital inmediata y aceptó sus consecuencias.",
  ],
  incomplete: [
    "Select a customer, add products and complete the required addresses.",
    "Wähle einen Kunden, füge Produkte hinzu und vervollständige die Pflichtadressen.",
    "Sélectionnez un client, ajoutez des produits et complétez les adresses.",
    "Selecciona un cliente, añade productos y completa las direcciones.",
  ],
  loading: ["Loading…", "Wird geladen…", "Chargement…", "Cargando…"],
} as const;
export function useAdminCreationText() {
  const { locale } = useLocale();
  const index =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.split("-")[0]
    ] ?? 0;
  return {
    locale,
    n: (key: keyof typeof adminCreationWords) => adminCreationWords[key][index],
  };
}
