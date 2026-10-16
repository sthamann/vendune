/** Actionable configuration recovery uses safe diagnostics; material input values and guest details are never displayed as errors. */
export const configurationErrors = {
  "Source price currency is not configured": [
    "This configuration cannot be priced in the selected currency. The shop needs to configure its source currency and exchange rate.",
    "Diese Konfiguration kann in der ausgewählten Währung nicht berechnet werden. Der Shop muss die Preiswährung und ihren Wechselkurs einrichten.",
    "Cette configuration ne peut être chiffrée dans la devise choisie. La boutique doit configurer la devise source et son taux.",
    "No se puede calcular esta configuración en la moneda elegida. La tienda debe configurar la moneda de origen y su cambio.",
  ],
  "App price changed; configure again": [
    "The material or price rule changed. Open this product’s configuration again and review the updated price before ordering.",
    "Material oder Preisregel wurden geändert. Öffne die Produktkonfiguration erneut und prüfe den aktualisierten Preis vor der Bestellung.",
    "Le matériau ou la règle de prix a changé. Rouvrez la configuration et vérifiez le prix avant de commander.",
    "Cambió el material o la regla de precio. Abre la configuración y revisa el nuevo precio antes de pedir.",
  ],
  "App changed; configure again": [
    "The configurator was updated. Reopen the product configuration and review your choices.",
    "Der Konfigurator wurde aktualisiert. Öffne die Produktkonfiguration erneut und prüfe deine Auswahl.",
    "Le configurateur a été mis à jour. Rouvrez-le et vérifiez vos choix.",
    "El configurador se actualizó. Ábrelo de nuevo y revisa tu selección.",
  ],
  "App rejected configuration or exceeded platform money bound": [
    "The selected combination is unavailable. Review the material and dimensions or ask the shop for an individual quote.",
    "Diese Kombination ist nicht verfügbar. Prüfe Material und Maße oder frage den Shop nach einem individuellen Angebot.",
    "Cette combinaison est indisponible. Vérifiez matériau et dimensions ou demandez un devis.",
    "La combinación no está disponible. Revisa material y medidas o pide un presupuesto.",
  ],
} as const;
