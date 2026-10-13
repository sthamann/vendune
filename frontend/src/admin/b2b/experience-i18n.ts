/** Guided company purchasing and shared settings copy in all bundled interface languages. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  settings: [
    "Company purchasing",
    "Firmeneinkauf",
    "Achats d’entreprise",
    "Compras empresariales",
  ],
  settingsHint: [
    "Enable the tools your business needs. Company-specific budgets, approvals and catalogues remain under each purchasing unit.",
    "Aktiviere die benötigten Werkzeuge. Firmenspezifische Budgets, Freigaben und Kataloge pflegst du weiterhin je Einkaufseinheit.",
    "Active les outils nécessaires. Budgets, validations et catalogues restent configurés par unité d’achat.",
    "Activa las herramientas necesarias. Los presupuestos, aprobaciones y catálogos se configuran por unidad de compra.",
  ],
  enabled: [
    "Enable B2B purchasing",
    "B2B-Einkauf aktivieren",
    "Activer les achats B2B",
    "Activar compras B2B",
  ],
  quotes: [
    "Offers & negotiation",
    "Angebote & Verhandlung",
    "Offres et négociation",
    "Ofertas y negociación",
  ],
  quotesHint: [
    "Request offers, exchange counterproposals and buy at accepted prices through API, MCP and UCP.",
    "Angebote anfragen, Gegenangebote besprechen und zu akzeptierten Preisen einkaufen — über API, MCP und UCP.",
    "Demander des offres, négocier et acheter aux prix acceptés via API, MCP et UCP.",
    "Solicitar ofertas, negociar y comprar a precios aceptados mediante API, MCP y UCP.",
  ],
  approvals: [
    "Purchasing approval",
    "Einkaufsfreigaben",
    "Validation des achats",
    "Aprobaciones de compra",
  ],
  approvalsHint: [
    "Separate employees approve purchases; existing thresholds never disappear when this tool is disabled.",
    "Separate Mitarbeiter geben Einkäufe frei. Vorhandene Freigabegrenzen bleiben auch bei deaktiviertem Werkzeug verbindlich.",
    "Des employés distincts valident les achats. Les seuils existants restent obligatoires même si l’outil est désactivé.",
    "Empleados distintos aprueban compras. Los umbrales existentes siguen siendo obligatorios aunque se desactive la herramienta.",
  ],
  lists: [
    "Order lists",
    "Bestelllisten",
    "Listes de commande",
    "Listas de pedidos",
  ],
  listsHint: [
    "Private or shared purchasing lists for repeat orders.",
    "Private oder gemeinsame Einkaufslisten für wiederkehrende Bestellungen.",
    "Listes privées ou partagées pour les achats récurrents.",
    "Listas privadas o compartidas para compras recurrentes.",
  ],
  quickOrder: [
    "Quick order",
    "Schnellbestellung",
    "Commande rapide",
    "Pedido rápido",
  ],
  quickOrderHint: [
    "Add products by SKU and quantity using the same cart.",
    "Produkte per Artikelnummer und Menge in denselben Warenkorb übernehmen.",
    "Ajouter des produits par référence et quantité au même panier.",
    "Añadir productos por referencia y cantidad al mismo carrito.",
  ],
  edi: [
    "EDI requisitions",
    "EDI-Bestellanforderungen",
    "Demandes EDI",
    "Solicitudes EDI",
  ],
  ediHint: [
    "Use the separate EDI app to import reviewed EDIFACT, UBL or cXML requests.",
    "Über die separate EDI-App geprüfte EDIFACT-, UBL- oder cXML-Anforderungen importieren.",
    "Importer des demandes EDIFACT, UBL ou cXML vérifiées avec l’app EDI séparée.",
    "Importar solicitudes EDIFACT, UBL o cXML revisadas con la app EDI independiente.",
  ],
  catalogs: [
    "Private catalogues",
    "Private Kataloge",
    "Catalogues privés",
    "Catálogos privados",
  ],
  catalogsHint: [
    "Select the products each unit can buy. Existing restrictions remain enforced.",
    "Wähle die Produkte, die eine Einheit einkaufen darf. Bestehende Einschränkungen bleiben verbindlich.",
    "Choisir les produits autorisés par unité. Les restrictions existantes restent appliquées.",
    "Elegir productos por unidad. Las restricciones existentes siguen vigentes.",
  ],
  companies: [
    "Companies & units",
    "Firmen & Einkaufseinheiten",
    "Sociétés et unités",
    "Empresas y unidades",
  ],
  members: [
    "Customers & employees",
    "Kunden & Mitarbeiter",
    "Clients et employés",
    "Clientes y empleados",
  ],
  membersHint: [
    "Link existing customers to a purchasing unit and set their buying and approval permissions.",
    "Verknüpfe bestehende Kunden mit einer Einkaufseinheit und lege Kauf- und Freigaberechte fest.",
    "Associer les clients existants à une unité et définir leurs droits d’achat et de validation.",
    "Asociar clientes existentes a una unidad y definir permisos de compra y aprobación.",
  ],
  budgets: [
    "Budgets & payment terms",
    "Budgets & Zahlungsbedingungen",
    "Budgets et conditions",
    "Presupuestos y condiciones",
  ],
  budgetsHint: [
    "Set currency, budget period, cost centre, purchase-order requirement and available payment/shipping methods per unit.",
    "Währung, Budgetzeitraum, Kostenstelle, Bestellreferenz sowie erlaubte Zahlungs- und Versandarten je Einheit konfigurieren.",
    "Configurer devise, période budgétaire, centre de coûts, référence et méthodes par unité.",
    "Configurar moneda, período presupuestario, centro de costes, referencia y métodos por unidad.",
  ],
  openSettings: [
    "Configure B2B",
    "B2B konfigurieren",
    "Configurer le B2B",
    "Configurar B2B",
  ],
  moduleEntry: [
    "Choose a company below, then open its purchasing unit to configure employees, budgets, approvals and its private catalogue. Linked buyers use lists and quick order in their customer account; EDI connects through the separate app.",
    "Wähle unten eine Firma und öffne ihre Einkaufseinheit für Mitarbeiter, Budgets, Freigaben und den privaten Katalog. Verknüpfte Käufer nutzen Listen und Schnellbestellung im Kundenkonto; EDI wird über die separate App verbunden.",
    "Choisis une société puis son unité pour gérer employés, budgets, validations et catalogue. Les acheteurs utilisent listes et commande rapide dans leur compte ; EDI passe par l’application distincte.",
    "Elige una empresa y su unidad para configurar empleados, presupuestos, aprobaciones y catálogo. Los compradores usan listas y pedido rápido en su cuenta; EDI usa la app independiente.",
  ],
  createHint: [
    "Start with the company name. The first purchasing unit is created automatically; optionally link an existing customer now.",
    "Starte mit dem Firmennamen. Die erste Einkaufseinheit entsteht automatisch; einen bestehenden Kunden kannst du direkt verknüpfen.",
    "Commence par le nom. La première unité est créée automatiquement ; associe un client existant si tu le souhaites.",
    "Empieza con el nombre. La primera unidad se crea automáticamente; puedes asociar un cliente existente ahora.",
  ],
  search: [
    "Search companies",
    "Firmen suchen",
    "Rechercher des sociétés",
    "Buscar empresas",
  ],
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
  select: [
    "Select customer",
    "Kunden auswählen",
    "Choisir un client",
    "Seleccionar cliente",
  ],
  change: [
    "Choose another customer",
    "Anderen Kunden auswählen",
    "Choisir un autre client",
    "Elegir otro cliente",
  ],
} as const;
export type B2BExperienceKey = keyof typeof words;
export function useB2BExperienceText() {
  const { locale } = useLocale();
  return (key: B2BExperienceKey) =>
    words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]];
}
