/** Interface vocabulary for native app model extensions; merchant labels keep their own language scope. */
import { useLocale } from "./i18n";
const words = {
  omitted: [
    "Some app fields exceed this preview's limits. Open the app to read the complete records.",
    "Einige App-Felder überschreiten die Grenzen dieser Vorschau. Öffne die App, um die vollständigen Datensätze zu lesen.",
    "Certains champs dépassent les limites de cet aperçu. Ouvre l’app pour lire les enregistrements complets.",
    "Algunos campos superan los límites de esta vista previa. Abre la app para leer los registros completos.",
  ],
  fields: ["App fields", "App-Felder", "Champs d’app", "Campos de app"],
  field: ["Field", "Feld", "Champ", "Campo"],
  value: ["Exact value", "Exakter Wert", "Valeur exacte", "Valor exacto"],
  yes: ["Yes", "Ja", "Oui", "Sí"],
  no: ["No", "Nein", "Non", "No"],
  binding: [
    "Extend a shop object",
    "Shop-Objekt erweitern",
    "Étendre un objet de la boutique",
    "Ampliar un objeto de la tienda",
  ],
  independent: [
    "Independent app records",
    "Eigene App-Datensätze",
    "Données indépendantes de l’app",
    "Registros propios de la app",
  ],
  product: ["Product", "Produkt", "Produit", "Producto"],
  customer: ["Customer", "Kunde", "Client", "Cliente"],
  order: ["Order", "Bestellung", "Commande", "Pedido"],
  company: ["Company", "Firma", "Entreprise", "Empresa"],
  hint: [
    "Fields appear on this object's administration page and in its grid. One private record per object; native rights still apply.",
    "Die Felder erscheinen in der Verwaltung dieses Objekts und im Grid. Ein privater Datensatz pro Objekt; die ursprünglichen Rechte gelten weiterhin.",
    "Les champs apparaissent dans l’administration de cet objet et sa grille. Un enregistrement privé par objet ; les droits natifs s’appliquent.",
    "Los campos aparecen en la administración del objeto y en su tabla. Un registro privado por objeto; se mantienen los permisos nativos.",
  ],
} as const;
export function useCoreExtensionText() {
  const { locale } = useLocale();
  const index = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: keyof typeof words) => words[key][index];
}
