/** Native package allocation vocabulary; content/product labels retain the order's selected language. */
import { useLocale } from "./i18n";
const words = {
  split: [
    "Split into another package",
    "Auf weiteres Paket aufteilen",
    "Répartir dans un autre colis",
    "Dividir en otro paquete",
  ],
  hint: [
    "Choose quantities for the new package. Keep at least one item here. Prices and shipping charges stay unchanged.",
    "Wähle die Mengen für das neue Paket. Mindestens ein Artikel bleibt hier. Preise und Versandkosten bleiben unverändert.",
    "Choisis les quantités du nouveau colis. Garde au moins un article ici. Prix et frais restent inchangés.",
    "Elige las cantidades del nuevo paquete. Conserva al menos un artículo aquí. Los precios y costes no cambian.",
  ],
  quantity: [
    "Quantity in new package",
    "Menge im neuen Paket",
    "Quantité du nouveau colis",
    "Cantidad en el nuevo paquete",
  ],
  create: [
    "Create package",
    "Paket erstellen",
    "Créer le colis",
    "Crear paquete",
  ],
  cancel: ["Cancel", "Abbrechen", "Annuler", "Cancelar"],
  invalid: [
    "Choose a positive subset of the available quantities.",
    "Wähle einen Teil der verfügbaren Mengen aus.",
    "Choisis une partie des quantités disponibles.",
    "Selecciona una parte de las cantidades disponibles.",
  ],
  package: ["Package", "Paket", "Colis", "Paquete"],
  splitEvent: [
    "Shipment split into packages",
    "Lieferung auf Pakete aufgeteilt",
    "Livraison répartie en colis",
    "Envío dividido en paquetes",
  ],
} as const;
export function useShipmentText() {
  const { locale } = useLocale();
  const index =
    locale === "de-DE"
      ? 1
      : locale === "fr-FR"
        ? 2
        : locale === "es-ES"
          ? 3
          : 0;
  return (key: keyof typeof words) => words[key][index];
}
