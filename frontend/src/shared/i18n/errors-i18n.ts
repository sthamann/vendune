/** Localized request guidance across all transports; original diagnostics remain available to developer tools. */
import { getLocale } from "./i18n";
import { configurationErrors } from "./configuration-errors-i18n";
import { appCapabilityWords } from "./app-capability-i18n";
const messages: Record<string, readonly string[]> = {
  ...configurationErrors,
  "Design provider unavailable; your page is unchanged": [
    "The design provider is unavailable. Check the central AI connection and retry; your saved page is unchanged.",
    "Der Design-Anbieter ist nicht erreichbar. Prüfe die zentrale KI-Verbindung und versuche es erneut; deine Seite bleibt unverändert.",
    "Le fournisseur de design est indisponible. Vérifiez la connexion IA et réessayez ; la page reste inchangée.",
    "El proveedor de diseño no está disponible. Revisa la conexión IA y reintenta; la página no ha cambiado.",
  ],
  "A page already uses this address in this channel": [
    "This page address is already used in this channel. Choose another address or edit the existing page.",
    "Diese Seitenadresse wird in diesem Kanal bereits verwendet. Wähle eine andere Adresse oder bearbeite die bestehende Seite.",
    "Cette adresse existe déjà sur ce canal. Choisissez-en une autre ou modifiez la page existante.",
    "Esta dirección ya existe en el canal. Elige otra o edita la página existente.",
  ],
  "Page changed during design generation": [
    "The page changed during generation. Reload and prepare new alternatives.",
    "Die Seite wurde während der Generierung geändert. Lade sie neu und bereite neue Alternativen vor.",
    "La page a changé pendant la génération. Actualisez et préparez de nouvelles variantes.",
    "La página cambió durante la generación. Actualiza y prepara nuevas alternativas.",
  ],
  "Workspace changed in another window; reload before saving": [
    "Your workspace changed in another window. Reload before saving; your local arrangement is still visible.",
    "Dein Arbeitsplatz wurde in einem anderen Fenster geändert. Lade vor dem Speichern neu; deine lokale Anordnung bleibt sichtbar.",
    "Votre espace a changé dans une autre fenêtre. Actualisez avant d’enregistrer.",
    "Tu espacio cambió en otra ventana. Actualiza antes de guardar.",
  ],

  "Customer already exists; select the existing customer": [
    "This email already belongs to a customer. Select the existing customer instead.",
    "Für diese E-Mail besteht bereits ein Kunde. Wähle den bestehenden Kunden aus.",
    "Cette adresse correspond déjà à un client. Sélectionnez ce client.",
    "Este correo ya pertenece a un cliente. Selecciona el cliente existente.",
  ],
  "Complete customer profile and billing address required": [
    "Complete the customer details and billing address.",
    "Vervollständige die Kundendaten und die Rechnungsadresse.",
    "Complétez les coordonnées du client et l’adresse de facturation.",
    "Completa los datos del cliente y la dirección de facturación.",
  ],
  "Address country unavailable": [
    "Select a country enabled for this shop.",
    "Wähle ein für diesen Shop freigegebenes Land.",
    "Choisissez un pays activé pour cette boutique.",
    "Elige un país habilitado para esta tienda.",
  ],
  "Buyer payment required for this provider": [
    "This provider requires the buyer to pay. Select a configured manual payment method for an admin order.",
    "Bei diesem Anbieter muss der Käufer selbst bezahlen. Wähle für die Admin-Bestellung eine eingerichtete manuelle Zahlungsart.",
    "Ce prestataire exige un paiement par l’acheteur. Choisissez un mode de paiement manuel pour cette commande.",
    "Este proveedor requiere que pague el comprador. Elige un método de pago manual para este pedido.",
  ],
  "Buyer payment required for this provider; review the configured manual payment again":
    [
      "The payment configuration changed. Review the order and select a manual payment method.",
      "Die Zahlungskonfiguration wurde geändert. Prüfe die Bestellung erneut und wähle eine manuelle Zahlungsart.",
      "La configuration du paiement a changé. Vérifiez la commande et choisissez un paiement manuel.",
      "La configuración de pago cambió. Revisa el pedido y elige un pago manual.",
    ],
  "Product unavailable in sales channel; review the order again": [
    "A product is no longer available in this channel. Edit and review the order again.",
    "Ein Produkt ist in diesem Kanal nicht mehr verfügbar. Bearbeite und prüfe die Bestellung erneut.",
    "Un produit n’est plus disponible sur ce canal. Modifiez et vérifiez la commande.",
    "Un producto ya no está disponible en este canal. Edita y revisa el pedido.",
  ],
  "Order language unavailable": [
    "Select a language enabled for this sales channel.",
    "Wähle eine für diesen Verkaufskanal freigegebene Sprache.",
    "Choisissez une langue activée pour ce canal de vente.",
    "Elige un idioma habilitado para este canal de ventas.",
  ],
  "Customer unavailable": [
    "The selected customer is unavailable. Select an active customer from this shop.",
    "Der ausgewählte Kunde ist nicht verfügbar. Wähle einen aktiven Kunden aus diesem Shop.",
    "Le client sélectionné est indisponible. Choisissez un client actif de cette boutique.",
    "El cliente seleccionado no está disponible. Elige un cliente activo de esta tienda.",
  ],

  "Advice sources changed during inference; ask again": [
    "Products or supporting information changed while the answer was being prepared. Please ask again.",
    "Produkte oder Belege wurden während der Antwort geändert. Bitte frage erneut.",
    "Les produits ou les sources ont changé pendant la préparation de la réponse. Veuillez réessayer.",
    "Los productos o las fuentes cambiaron durante la respuesta. Vuelve a preguntar.",
  ],
  "Private advice context changed during inference; ask again": [
    "Your private preferences or permission changed while the answer was being prepared. Please ask again.",
    "Deine privaten Präferenzen oder deine Freigabe wurden während der Antwort geändert. Bitte frage erneut.",
    "Vos préférences privées ou votre autorisation ont changé pendant la réponse. Veuillez réessayer.",
    "Tus preferencias privadas o tu permiso cambiaron durante la respuesta. Vuelve a preguntar.",
  ],
  "Invalid app ontology mapping": [
    "Check the graph mapping: select an enabled AI model, a native list action, a valid type and existing fields.",
    "Prüfe die Graph-Zuordnung: Wähle ein für KI freigegebenes Modell, eine native Leseaktion, einen gültigen Typ und vorhandene Felder.",
    "Vérifiez le graphe : modèle autorisé pour l’IA, action de lecture native, type valide et champs existants.",
    "Revisa el grafo: modelo habilitado para IA, acción de lectura nativa, tipo válido y campos existentes.",
  ],
  "Account already exists": [
    "An account with this email already exists. Sign in instead.",
    "Für diese E-Mail besteht bereits ein Konto. Bitte melde dich an.",
    "Un compte existe déjà avec cette adresse e-mail. Connectez-vous.",
    "Ya existe una cuenta con este correo. Inicia sesión.",
  ],
  "Checkout changed; review your order again": [
    "The price or checkout changed. Review your order again before placing it.",
    "Preis oder Checkout haben sich geändert. Prüfe die Bestellung vor dem Abschluss erneut.",
    "Le prix ou la commande a changé. Vérifiez avant de commander.",
    "El precio o el pedido cambió. Revisa antes de realizar el pedido.",
  ],
  "Database capacity busy; retry later": [
    "The shop is busy. Please try again shortly.",
    "Der Shop ist gerade ausgelastet. Bitte versuche es gleich erneut.",
    "La boutique est occupée. Veuillez réessayer dans un instant.",
    "La tienda está ocupada. Inténtalo de nuevo en un momento.",
  ],
  "Customer group is assigned to customers": [
    "Assign the customers to another group before removing this group.",
    "Ordne die Kunden einer anderen Gruppe zu, bevor du diese Gruppe entfernst.",
    "Réaffectez les clients avant de supprimer ce groupe.",
    "Asigna los clientes a otro grupo antes de eliminar este grupo.",
  ],
  "Customer group is assigned to advanced prices": [
    "Update the product quantity prices before removing this group.",
    "Passe die Produkt-Staffelpreise an, bevor du diese Gruppe entfernst.",
    "Modifiez les prix dégressifs avant de supprimer ce groupe.",
    "Actualiza los precios por cantidad antes de eliminar este grupo.",
  ],
  "Customer group is used by a rule or flow": [
    "Update the rules or flows referencing this group before removing it.",
    "Passe die Regeln oder Flows an, die diese Gruppe verwenden, bevor du sie entfernst.",
    "Modifiez les règles ou flux utilisant ce groupe avant sa suppression.",
    "Actualiza las reglas o flujos que usan este grupo antes de eliminarlo.",
  ],
  "Unknown customer group": [
    "Choose a configured customer group.",
    "Wähle eine eingerichtete Kundengruppe.",
    "Choisissez un groupe client configuré.",
    "Elige un grupo de clientes configurado.",
  ],
  "Product number already exists": [
    "This product number is already used in this shop. Choose another number.",
    "Diese Produktnummer wird im Shop bereits verwendet. Wähle eine andere Nummer.",
    "Ce numéro de produit est déjà utilisé. Choisissez un autre numéro.",
    "Este número de producto ya está en uso. Elige otro número.",
  ],
  "Product sources changed; ask again": [
    "The product or its sources changed while answering. Please ask again for current information.",
    "Das Produkt oder seine Quellen wurden während der Antwort geändert. Frage erneut nach den aktuellen Angaben.",
    "Le produit ou ses sources ont changé pendant la réponse. Posez à nouveau votre question.",
    "El producto o sus fuentes cambiaron durante la respuesta. Vuelve a preguntar para obtener datos actuales.",
  ],
  "Product changed": [
    "Another change was saved. Keep your draft and reload the product before merging it.",
    "Eine andere Änderung wurde gespeichert. Bewahre deinen Entwurf und lade das Produkt vor dem Zusammenführen neu.",
    "Une autre modification a été enregistrée. Conservez votre brouillon et rechargez le produit.",
    "Se guardó otro cambio. Conserva tu borrador y vuelve a cargar el producto.",
  ],
  "Category parent is unavailable or creates a cycle": [
    "Choose an existing parent outside this category's own branch.",
    "Wähle eine bestehende übergeordnete Kategorie außerhalb dieses eigenen Zweigs.",
    "Choisissez un parent existant hors de la branche de cette catégorie.",
    "Elige una categoría superior existente fuera de esta misma rama.",
  ],
  "Category changed": [
    "The category changed. Reload it before saving your changes.",
    "Die Kategorie wurde geändert. Lade sie vor dem Speichern neu.",
    "La catégorie a changé. Rechargez-la avant d'enregistrer.",
    "La categoría cambió. Vuelve a cargarla antes de guardar.",
  ],
  "Invalid credentials": [
    "Email or password is incorrect.",
    "E-Mail oder Passwort ist falsch.",
    "Adresse e-mail ou mot de passe incorrect.",
    "El correo o la contraseña son incorrectos.",
  ],
  "Insufficient stock": [
    "This quantity is no longer available. Choose another quantity or variant.",
    "Diese Menge ist nicht mehr verfügbar. Wähle eine andere Menge oder Variante.",
    "Cette quantité n’est plus disponible. Choisissez une autre quantité ou variante.",
    "Esta cantidad ya no está disponible. Elige otra cantidad o variante.",
  ],
  "Cart revision changed; reload before editing": [
    "The cart has changed. Refresh it before continuing.",
    "Der Warenkorb hat sich geändert. Lade ihn vor dem Fortfahren neu.",
    "Le panier a changé. Actualisez-le avant de continuer.",
    "El carrito ha cambiado. Actualízalo antes de continuar.",
  ],
  "Live content changed; resolve before release": [
    "The live shop has changed. Resolve the conflict before publishing.",
    "Der Live-Shop hat sich geändert. Löse den Konflikt vor der Veröffentlichung.",
    "La boutique en ligne a changé. Résolvez le conflit avant publication.",
    "La tienda publicada ha cambiado. Resuelve el conflicto antes de publicar.",
  ],
};
const fallback: Record<string, readonly string[]> = {
  401: [
    "Please sign in again.",
    "Bitte melde dich erneut an.",
    "Veuillez vous reconnecter.",
    "Vuelve a iniciar sesión.",
  ],
  403: [
    "Your account cannot perform this action in this shop.",
    "Dein Konto darf diese Aktion in diesem Shop nicht ausführen.",
    "Votre compte ne peut pas effectuer cette action dans cette boutique.",
    "Tu cuenta no puede realizar esta acción en esta tienda.",
  ],
  404: [
    "This item is unavailable in the selected shop or sales channel.",
    "Dieser Eintrag ist im ausgewählten Shop oder Verkaufskanal nicht verfügbar.",
    "Cet élément n’est pas disponible dans cette boutique ou ce canal.",
    "Este elemento no está disponible en la tienda o canal seleccionado.",
  ],
  409: [
    "The data has changed. Refresh and review before trying again.",
    "Die Daten haben sich geändert. Lade sie neu und prüfe sie vor einem neuen Versuch.",
    "Les données ont changé. Actualisez et vérifiez avant de réessayer.",
    "Los datos han cambiado. Actualiza y revisa antes de volver a intentarlo.",
  ],
  429: [
    "The service is busy. Try again shortly.",
    "Der Dienst ist ausgelastet. Versuche es gleich noch einmal.",
    "Le service est occupé. Réessayez dans un instant.",
    "El servicio está ocupado. Inténtalo de nuevo en un momento.",
  ],
  400: [
    "Check the required fields, translations and selected settings.",
    "Prüfe die Pflichtfelder, Übersetzungen und ausgewählten Einstellungen.",
    "Vérifiez les champs requis, les traductions et les paramètres sélectionnés.",
    "Revisa los campos obligatorios, traducciones y ajustes seleccionados.",
  ],
  500: [
    "The service could not complete the request. Try again or check its configuration.",
    "Der Dienst konnte die Anfrage nicht abschließen. Versuche es erneut oder prüfe seine Konfiguration.",
    "Le service n’a pas pu traiter la demande. Réessayez ou vérifiez sa configuration.",
    "El servicio no pudo completar la solicitud. Inténtalo de nuevo o revisa su configuración.",
  ],
};
export function responseError(
  detail: string,
  status: number,
  problem?: { pointer?: string; kind?: string },
): Error {
  const i = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[getLocale()];
  // Identify the declared field from structured metadata, never by parsing diagnostic prose.
  const example =
    problem?.kind === "validation_error" && typeof problem.pointer === "string"
      ? /^(?:\/capability\/examples|\/configuration\/inputs\/examples)\/(\d+)\/(?:expected|expectedFeeMinor)$/.exec(
          problem.pointer,
        )
      : null;
  const message =
    example && Number(example[1]) < 12
      ? appCapabilityWords.exampleFailure[i].replace(
          "{example}",
          String(Number(example[1]) + 1),
        )
      : (messages[detail] ?? fallback[String(status)] ?? fallback[500])[i];
  const error = new Error(message);
  Object.assign(error, {
    diagnostic: detail,
    status,
    ...(problem?.pointer ? { pointer: problem.pointer } : {}),
  });
  return error;
}
