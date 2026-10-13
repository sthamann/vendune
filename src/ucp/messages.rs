//! Human-readable UCP purchasing messages follow the native checkout locale; stable codes remain language-independent.
pub(super) fn content(code: &str, locale: &str) -> &'static str {
    let lang = locale.split(['-', '_']).next().unwrap_or("en");
    match (code, lang) {
        ("b2b_budget_exceeded", "de") => {
            "Das Einkaufsbudget ist überschritten. Wende dich an die Unternehmensverwaltung."
        }
        ("b2b_budget_exceeded", "es") => {
            "Se ha superado el presupuesto de compras. Contacta con el administrador de la empresa."
        }
        ("b2b_budget_exceeded", "fr") => {
            "Le budget d’achat est dépassé. Contactez l’administrateur de votre entreprise."
        }
        ("b2b_budget_exceeded", _) => "Purchasing budget exceeded. Ask your company administrator.",
        ("b2b_purchase_order_required", "de") => {
            "Gib die von deinem Unternehmen geforderte Bestellreferenz ein."
        }
        ("b2b_purchase_order_required", "es") => {
            "Introduce la referencia de pedido requerida por tu empresa."
        }
        ("b2b_purchase_order_required", "fr") => {
            "Saisissez la référence de commande requise par votre entreprise."
        }
        ("b2b_purchase_order_required", _) => {
            "Enter the purchase-order reference required by your company."
        }
        ("b2b_approval_required", "de") => {
            "Der aktuelle ausgehandelte Einkauf benötigt die Freigabe einer anderen berechtigten Person."
        }
        ("b2b_approval_required", "es") => {
            "La compra negociada actual requiere la aprobación de otra persona autorizada."
        }
        ("b2b_approval_required", "fr") => {
            "L’achat négocié actuel nécessite l’approbation d’une autre personne autorisée."
        }
        ("b2b_approval_required", _) => {
            "The current negotiated checkout requires a separate authorized purchasing approver."
        }
        ("payment_customer_action_required", "de") => {
            "Bestätige die externe Zahlung im Händler-Checkout. Die Bestellung wurde angelegt; die Zahlung ist noch nicht bestätigt."
        }
        ("payment_customer_action_required", "es") => {
            "Confirma el pago externo en el checkout. El pedido existe, pero el pago aún no está confirmado."
        }
        ("payment_customer_action_required", "fr") => {
            "Confirmez le paiement externe dans le checkout. La commande existe, mais le paiement n’est pas encore confirmé."
        }
        ("payment_customer_action_required", _) => {
            "Continue in merchant checkout to approve the external payment. An order exists but payment is not confirmed."
        }
        (_, "de") => {
            "Prüfe Lieferadresse, Zahlungsart und Endbetrag im Händler-Checkout vor dem Abschluss."
        }
        (_, "es") => {
            "Revisa la dirección, el método de pago y el importe final en el checkout antes de completar la compra."
        }
        (_, "fr") => {
            "Vérifiez l’adresse, le moyen de paiement et le montant final dans le checkout avant de terminer."
        }
        (_, _) => {
            "Review delivery address, payment method and final amount in merchant checkout before completion."
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn all_purchasing_messages_have_distinct_translations_and_english_fallback() {
        for code in [
            "b2b_budget_exceeded",
            "b2b_purchase_order_required",
            "b2b_approval_required",
            "payment_customer_action_required",
            "requires_buyer_input",
        ] {
            let en = content(code, "en-GB");
            for locale in ["de-DE", "es-ES", "fr-FR"] {
                assert_ne!(content(code, locale), en);
            }
            assert_eq!(content(code, "it-IT"), en);
        }
    }
}
