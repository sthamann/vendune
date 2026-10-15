/** Permission grouping is presentation only; grants still come from the canonical server scope registry. */
import { useLocale } from "../../shared/i18n/i18n";
const groups = {
  catalog: [
    "Products & catalog",
    "Produkte & Katalog",
    "Produits et catalogue",
    "Productos y catálogo",
  ],
  orders: [
    "Orders & fulfillment",
    "Bestellungen & Versand",
    "Commandes et livraison",
    "Pedidos y envíos",
  ],
  customers: [
    "Customers & privacy",
    "Kunden & Datenschutz",
    "Clients et confidentialité",
    "Clientes y privacidad",
  ],
  b2b: [
    "Companies & purchasing",
    "Firmen & Einkauf",
    "Entreprises et achats",
    "Empresas y compras",
  ],
  apps: [
    "Installed apps",
    "Installierte Apps",
    "Apps installées",
    "Apps instaladas",
  ],
  developer: ["App Studio", "App Studio", "App Studio", "App Studio"],
  environments: [
    "Sandbox & publication",
    "Sandbox & Veröffentlichung",
    "Sandbox et publication",
    "Sandbox y publicación",
  ],
  knowledge: [
    "Shop knowledge",
    "Shopwissen",
    "Connaissances boutique",
    "Conocimiento de tienda",
  ],
  ai: ["AI connections", "KI-Verbindungen", "Connexions IA", "Conexiones IA"],
  payments: [
    "Payments & refunds",
    "Zahlungen & Erstattungen",
    "Paiements et remboursements",
    "Pagos y reembolsos",
  ],
  documents: ["Documents", "Belege", "Documents", "Documentos"],
  settings: [
    "Shop settings",
    "Shop-Einstellungen",
    "Paramètres boutique",
    "Ajustes de tienda",
  ],
  team: [
    "Team & access",
    "Team & Zugang",
    "Équipe et accès",
    "Equipo y acceso",
  ],
  channels: [
    "Sales channels",
    "Verkaufskanäle",
    "Canaux de vente",
    "Canales de venta",
  ],
  pos: ["Point of sale", "Kasse", "Point de vente", "Punto de venta"],
  automation: [
    "Rules & flows",
    "Regeln & Flows",
    "Règles et flux",
    "Reglas y flujos",
  ],
  assistant: [
    "Commerce assistant",
    "Commerce-Assistent",
    "Assistant commerce",
    "Asistente commerce",
  ],
  overview: [
    "Business overview",
    "Geschäftsübersicht",
    "Vue d’activité",
    "Resumen de negocio",
  ],
} as const;
export function usePermissionGroupText() {
  const { locale } = useLocale();
  return (k: string) =>
    groups[k as keyof typeof groups]?.[
      { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]
    ] ?? k;
}
