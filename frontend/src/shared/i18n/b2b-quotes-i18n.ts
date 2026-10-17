/** Negotiation vocabulary, separate from merchant content translations. */
import { useLocale } from "./i18n";
export const b2bQuoteWords = {
  title: [
    "Quotes & negotiation",
    "Angebote & Verhandlung",
    "Devis et négociation",
    "Presupuestos y negociación",
  ],
  message: ["Message", "Nachricht", "Message", "Mensaje"],
  request: [
    "Request a quote for this cart",
    "Angebot für diesen Warenkorb anfragen",
    "Demander un devis pour ce panier",
    "Solicitar presupuesto para este carrito",
  ],
  refresh: [
    "Refresh quotes",
    "Angebote aktualisieren",
    "Actualiser les devis",
    "Actualizar presupuestos",
  ],
  offer: [
    "Send offer",
    "Angebot senden",
    "Envoyer devis",
    "Enviar presupuesto",
  ],
  accept: [
    "Accept for this cart",
    "Für diesen Warenkorb annehmen",
    "Accepter pour ce panier",
    "Aceptar para este carrito",
  ],
  release: [
    "Release offer before editing",
    "Angebot vor Bearbeitung lösen",
    "Détacher le devis avant modification",
    "Desvincular antes de editar",
  ],
  send: [
    "Send message",
    "Nachricht senden",
    "Envoyer message",
    "Enviar mensaje",
  ],
  reject: [
    "Reject quote",
    "Angebot ablehnen",
    "Refuser devis",
    "Rechazar presupuesto",
  ],
  expiry: ["Valid until", "Gültig bis", "Valable jusqu’au", "Válido hasta"],
  price: [
    "Gross unit price (minor units)",
    "Bruttopreis pro Stück (kleinste Einheit)",
    "Prix brut unitaire (unités mineures)",
    "Precio bruto unitario (unidades menores)",
  ],
  hint: [
    "Exact prices apply to the original cart, currency and quantities. Approval and budget limits still apply.",
    "Die Preise gelten für den ursprünglichen Warenkorb, die Währung und Mengen. Freigaben und Budget gelten weiterhin.",
    "Prix liés au panier original, devise et quantités. Approbation et budget restent applicables.",
    "Precios vinculados al carrito original, moneda y cantidades. Siguen vigentes aprobación y presupuesto.",
  ],
  empty: [
    "No quote requests yet",
    "Noch keine Angebotsanfragen",
    "Aucune demande de devis",
    "Aún no hay solicitudes",
  ],
  requested: ["Requested", "Angefragt", "Demandé", "Solicitado"],
  offered: [
    "Offer sent",
    "Angebot gesendet",
    "Devis envoyé",
    "Presupuesto enviado",
  ],
  accepted: ["Accepted", "Angenommen", "Accepté", "Aceptado"],
  ordered: ["Ordered", "Bestellt", "Commandé", "Comprado"],
  rejected: ["Rejected", "Abgelehnt", "Refusé", "Rechazado"],
  merchant: ["Merchant", "Händler", "Marchand", "Comerciante"],
  buyer: ["Buyer", "Einkäufer", "Acheteur", "Comprador"],
  orders: [
    "Unit orders",
    "Bestellungen der Abteilung",
    "Commandes de l’unité",
    "Pedidos de la unidad",
  ],
  details: [
    "Order details",
    "Bestelldetails",
    "Détails commande",
    "Detalles del pedido",
  ],
} as const;
export type B2BQuoteWord = keyof typeof b2bQuoteWords;
export function useB2BQuoteText() {
  const { locale } = useLocale();
  const i = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: B2BQuoteWord) => b2bQuoteWords[key]?.[i];
}
