/** Merchant intent and executable decision examples use the shared four-language Studio vocabulary. */
import { useLocale } from "./i18n";
export const appCapabilityWords = {
  exampleFailure: [
    "Business example {example} failed. Review the expected result and the component before saving or installing.",
    "Geschäftsbeispiel {example} ist fehlgeschlagen. Prüfe das erwartete Ergebnis und die Komponente vor dem Speichern oder Installieren.",
    "L’exemple métier {example} a échoué. Vérifiez le résultat attendu et le composant avant de sauvegarder ou d’installer.",
    "El ejemplo comercial {example} falló. Revisa el resultado esperado y el componente antes de guardar o instalar.",
  ],
  capability: [
    "Business goal",
    "Geschäftsziel",
    "Objectif métier",
    "Objetivo comercial",
  ],
  hint: [
    "Describe what this app should achieve. Its data, interface and decisions stay in one versioned definition.",
    "Beschreibe, was diese App erreichen soll. Daten, Oberfläche und Entscheidungen bleiben in einer versionierten Definition.",
    "Décrivez ce que cette app doit accomplir. Données, interface et décisions restent dans une définition versionnée.",
    "Describe qué debe lograr esta app. Los datos, la interfaz y las decisiones siguen en una definición versionada.",
  ],
  intent: [
    "What should the app do?",
    "Was soll die App tun?",
    "Que doit faire l’app ?",
    "¿Qué debe hacer la app?",
  ],
  assumptions: [
    "Rules and assumptions",
    "Regeln und Annahmen",
    "Règles et hypothèses",
    "Reglas y supuestos",
  ],
  add: [
    "Add an assumption",
    "Annahme hinzufügen",
    "Ajouter une hypothèse",
    "Añadir un supuesto",
  ],
  remove: [
    "Remove assumption",
    "Annahme entfernen",
    "Supprimer l’hypothèse",
    "Eliminar supuesto",
  ],
  examples: [
    "Executable decision examples",
    "Ausführbare Entscheidungsbeispiele",
    "Exemples de décisions exécutables",
    "Ejemplos de decisiones ejecutables",
  ],
  checks: [
    "Declared examples run in the same isolated component as checkout before a version is saved or installed. A mismatch blocks that step. Use synthetic data only.",
    "Deklarierte Beispiele laufen vor dem Speichern oder Installieren in derselben abgeschirmten Komponente wie im Checkout. Eine Abweichung blockiert diesen Schritt. Verwende ausschließlich Beispieldaten.",
    "Les exemples déclarés s’exécutent dans le même composant isolé que le checkout avant la sauvegarde ou l’installation. Un écart bloque cette étape. Utilisez uniquement des données fictives.",
    "Los ejemplos declarados se ejecutan en el mismo componente aislado del checkout antes de guardar o instalar. Una diferencia bloquea ese paso. Usa solo datos ficticios.",
  ],
  empty: [
    "No executable examples declared. This does not verify the app’s business behavior. Add typed commerce examples through its package or coding-agent proposal.",
    "Keine ausführbaren Beispiele deklariert. Damit ist das Geschäftsverhalten der App nicht geprüft. Ergänze typisierte Commerce-Beispiele über das Paket oder einen Coding-Agenten-Vorschlag.",
    "Aucun exemple exécutable déclaré. Le comportement métier de l’app n’est donc pas vérifié. Ajoutez des exemples typés via son paquet ou une proposition d’agent.",
    "No hay ejemplos ejecutables declarados. Esto no verifica el comportamiento comercial de la app. Añade ejemplos tipados mediante el paquete o una propuesta del agente.",
  ],
  subtotal: [
    "Cart subtotal",
    "Warenkorb-Zwischenbetrag",
    "Sous-total du panier",
    "Subtotal del carrito",
  ],
  adjustment: [
    "Expected adjustment",
    "Erwartete Anpassung",
    "Ajustement attendu",
    "Ajuste esperado",
  ],
  price: ["Price", "Preis", "Prix", "Precio"],
  discount: ["Discount", "Rabatt", "Remise", "Descuento"],
  shipping: ["Shipping", "Versand", "Livraison", "Envío"],
  validation: ["Validation", "Prüfung", "Validation", "Validación"],
  accepted: [
    "Accept the decision",
    "Entscheidung annehmen",
    "Accepter la décision",
    "Aceptar la decisión",
  ],
  rejected: [
    "Reject the decision",
    "Entscheidung ablehnen",
    "Refuser la décision",
    "Rechazar la decisión",
  ],
} as const;
export function useAppCapabilityText() {
  const { locale } = useLocale();
  return (key: keyof typeof appCapabilityWords) =>
    appCapabilityWords[key][
      { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]
    ];
}
