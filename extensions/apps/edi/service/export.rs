//! Partner-bound outbound messages serialize existing orders/issued receipts; no fiscal numbers, prices or shipping events are invented.
use super::*;
use vendune::money::{Currency, Money};
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Input {
    pub partner_id: String,
    pub format: String,
    pub kind: String,
    pub order_id: String,
    pub receipt_id: Option<String>,
}
fn txt(v: &Value) -> Result<&str> {
    v.as_str()
        .filter(|s| !s.is_empty() && !s.chars().any(|c| c.is_control() && c != '\n'))
        .ok_or(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Required native document value missing",
        ))
}
fn xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('\"', "&quot;")
        .replace('\'', "&apos;")
}
fn edi(s: &str) -> String {
    s.replace('?', "??")
        .replace('+', "?+")
        .replace(':', "?:")
        .replace('\'', "?'")
}
fn amount(v: &Value, c: &Currency) -> Result<Money> {
    let n = v
        .as_f64()
        .filter(|n| n.is_finite() && *n >= 0.)
        .ok_or(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Invalid native document amount",
        ))?;
    Money::parse(&format!("{:.*}", c.scale() as usize, n), c.clone())
        .map_err(|e| error(StatusCode::UNPROCESSABLE_ENTITY, e))
}
pub async fn execute(a: &App, t: &str, i: Input) -> Result<Value> {
    if !["edifact", "ubl"].contains(&i.format.as_str())
        || !["order_response", "delivery_note", "invoice"].contains(&i.kind.as_str())
    {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "Use edifact/ubl and order_response/delivery_note/invoice",
        ));
    }
    let rows = a
        .record(
            t,
            "list_partners",
            json!({"filter":{"partner_id":i.partner_id},"limit":2}),
        )
        .await?;
    let partners = rows["elements"]
        .as_array()
        .ok_or(error(StatusCode::BAD_GATEWAY, "Invalid partner callback"))?;
    if partners.len() != 1 || partners[0]["active"] != true || partners[0]["format"] != i.format {
        return Err(error(
            StatusCode::FORBIDDEN,
            "One active partner mapping required",
        ));
    }
    let p = &partners[0];
    let s = if i.kind == "order_response" {
        json!({"order":a.callback(t,"order",json!({"id":i.order_id})).await?})
    } else {
        let receipt = i.receipt_id.as_deref().ok_or(error(
            StatusCode::BAD_REQUEST,
            "Select an already issued native receipt",
        ))?;
        let v = a
            .callback(
                t,
                "receipt_snapshot",
                json!({"id":i.order_id,"receiptId":receipt}),
            )
            .await?;
        if v["kind"] != i.kind {
            return Err(error(
                StatusCode::CONFLICT,
                "Issued document kind differs from requested export",
            ));
        }
        v
    };
    if s["order"]["b2b"]["unitId"] != p["unit_id"]
        || s["order"]["orderCustomer"]["customerId"] != p["buyer_id"]
    {
        return Err(error(
            StatusCode::FORBIDDEN,
            "Order differs from the mapped purchasing unit",
        ));
    }
    let body = render(&i.format, &i.kind, p, &s)?;
    if body.len() > 65536 {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Outbound document exceeds 64 KB",
        ));
    }
    Ok(
        json!({"kind":i.kind,"format":i.format,"document":body,"sourceOrderId":i.order_id,"sourceReceiptId":i.receipt_id,"contentType":if i.format=="ubl"{"application/xml"}else{"application/edifact"},"networkCertified":false,"profile":"vendune-basic-1","sourceHash":hash(&s.to_string())}),
    )
}
fn render(fmt: &str, kind: &str, p: &Value, s: &Value) -> Result<String> {
    let o = &s["order"];
    if kind == "order_response" && o["state"] == "cancelled" {
        return Err(error(
            StatusCode::CONFLICT,
            "Cancelled orders cannot be exported as accepted responses",
        ));
    }
    let cart = &o["cart"];
    let number = txt(if kind == "order_response" {
        &o["orderNumber"]
    } else {
        &s["number"]
    })?;
    let sender = txt(&p["receiver_id"])?;
    let receiver = txt(&p["sender_id"])?;
    let items = cart["lineItems"]
        .as_array()
        .filter(|a| !a.is_empty() && a.len() <= 100)
        .ok_or(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Expected 1..100 native order lines",
        ))?;
    let date = txt(if kind == "order_response" {
        &o["createdAt"]
    } else {
        &s["issuedAt"]
    })?
    .get(..10)
    .ok_or(error(
        StatusCode::UNPROCESSABLE_ENTITY,
        "Native issue date missing",
    ))?;
    let code = txt(&cart["price"]["currency"])?;
    let scale = cart["price"]["currencyScale"]
        .as_u64()
        .filter(|v| *v <= 6)
        .ok_or(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Native currency scale missing",
        ))? as u8;
    let c = Currency::new(code, scale).map_err(|e| error(StatusCode::UNPROCESSABLE_ENTITY, e))?;
    let net = amount(&cart["price"]["netPrice"], &c)?;
    let tax = amount(&cart["price"]["tax"], &c)?;
    let total = amount(&cart["price"]["totalPrice"], &c)?;
    if net.checked_add(&tax).ok().as_ref() != Some(&total) {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Native document totals do not reconcile at the explicit currency scale",
        ));
    }
    let mut lines = vec![];
    let mut sum = Money::new(0, c.clone());
    let mut rate: Option<f64> = None;
    for row in items {
        let sku = txt(&row["productNumber"])?;
        let qty = row["quantity"]
            .as_u64()
            .filter(|n| *n > 0 && *n <= 10000)
            .ok_or(error(
                StatusCode::UNPROCESSABLE_ENTITY,
                "Whole native quantities required",
            ))?;
        let line = amount(&row["price"]["totalPrice"], &c)?;
        sum = sum
            .checked_add(&line)
            .map_err(|e| error(StatusCode::UNPROCESSABLE_ENTITY, e))?;
        let unit = amount(&row["price"]["unitPrice"], &c)?;
        if kind == "invoice" {
            let taxes = row["price"]["calculatedTaxes"]
                .as_array()
                .filter(|a| a.len() == 1)
                .ok_or(error(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Basic invoice export requires one tax rate per line",
                ))?;
            let r = taxes[0]["taxRate"]
                .as_f64()
                .filter(|r| *r > 0. && *r <= 100.)
                .ok_or(error(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Tax exemptions need a configured partner invoice profile",
                ))?;
            if rate.is_some_and(|old| old != r) {
                return Err(error(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Multiple tax rates need a configured partner invoice profile",
                ));
            }
            rate = Some(r);
        }
        lines.push((sku, qty, line, unit, txt(&row["label"])?));
    }
    if kind == "invoice" && (cart["price"]["taxStatus"] != "net" || sum != net) {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Basic invoice export requires native net-priced lines without unrepresented shipping/discount adjustments",
        ));
    }
    let po = o["b2b"]["purchaseOrder"].as_str().unwrap_or("");
    if fmt == "edifact" {
        let (msg, bgm) = match kind {
            "invoice" => ("INVOIC", "380"),
            "delivery_note" => ("DESADV", "351"),
            _ => ("ORDRSP", "231"),
        };
        let reference = hash(&format!("{number}:{msg}"))[..16].to_string();
        let mut seg = vec![
            format!("UNH+{reference}+{msg}:D:96A:UN"),
            format!("BGM+{bgm}+{}+9", edi(number)),
            format!("DTM+137:{}:102", date.replace('-', "")),
            format!("RFF+ON:{}", edi(po)),
            format!("NAD+SU+{}::92", edi(sender)),
            format!("NAD+BY+{}::92", edi(receiver)),
            format!("CUX+2:{code}:4"),
        ];
        for (n, (sku, q, line, unit, _)) in lines.iter().enumerate() {
            seg.push(format!("LIN+{}++{}:SA", n + 1, edi(sku)));
            seg.push(format!(
                "QTY+{}:{q}:PCE",
                if kind == "delivery_note" { "12" } else { "21" }
            ));
            if kind == "invoice" {
                seg.push(format!("MOA+203:{}", line.decimal()));
                seg.push(format!("PRI+AAA:{}", unit.decimal()));
            }
        }
        seg.push("UNS+S".into());
        if kind == "invoice" {
            seg.push(format!("MOA+79:{}", net.decimal()));
            seg.push(format!("MOA+124:{}", tax.decimal()));
            seg.push(format!("MOA+39:{}", total.decimal()));
            seg.push(format!("TAX+7+VAT+++:::{}+S", rate.unwrap()));
        }
        seg.push(format!("UNT+{}+{reference}", seg.len() + 1));
        Ok(format!(
            "UNB+UNOC:3+{}+{}+{}:0000+{reference}'{}'UNZ+1+{reference}'",
            edi(sender),
            edi(receiver),
            date.replace('-', "").get(2..).unwrap_or(""),
            seg.join("'")
        ))
    } else {
        let root = match kind {
            "invoice" => "Invoice",
            "delivery_note" => "DespatchAdvice",
            _ => "OrderResponse",
        };
        let mut x = format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?><{root} xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:{root}-2\" xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\" xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\"><cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:ID>{}</cbc:ID><cbc:IssueDate>{}</cbc:IssueDate>",
            xml(number),
            xml(date)
        );
        if kind == "invoice" {
            x.push_str(&format!("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>{code}</cbc:DocumentCurrencyCode>"));
        }
        if kind == "order_response" {
            x.push_str("<cbc:OrderResponseCode>29</cbc:OrderResponseCode>");
        }
        x.push_str(&format!(
            "<cac:OrderReference><cbc:ID>{}</cbc:ID></cac:OrderReference>",
            xml(po)
        ));
        let (sup, buy) = match kind {
            "invoice" => ("AccountingSupplierParty", "AccountingCustomerParty"),
            "delivery_note" => ("DespatchSupplierParty", "DeliveryCustomerParty"),
            _ => ("SellerSupplierParty", "BuyerCustomerParty"),
        };
        for (tag, id) in [(sup, sender), (buy, receiver)] {
            x.push_str(&format!("<cac:{tag}><cac:Party><cac:PartyIdentification><cbc:ID>{}</cbc:ID></cac:PartyIdentification></cac:Party></cac:{tag}>",xml(id)));
        }
        if kind == "invoice" {
            let r = rate.unwrap();
            x.push_str(&format!("<cac:TaxTotal><cbc:TaxAmount currencyID=\"{code}\">{}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID=\"{code}\">{}</cbc:TaxableAmount><cbc:TaxAmount currencyID=\"{code}\">{}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>{r}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID=\"{code}\">{}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID=\"{code}\">{}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID=\"{code}\">{}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID=\"{code}\">{}</cbc:PayableAmount></cac:LegalMonetaryTotal>",tax.decimal(),net.decimal(),tax.decimal(),net.decimal(),net.decimal(),total.decimal(),total.decimal()));
        }
        for (n, (sku, q, line, unit, label)) in lines.iter().enumerate() {
            if kind == "invoice" {
                x.push_str(&format!("<cac:InvoiceLine><cbc:ID>{}</cbc:ID><cbc:InvoicedQuantity unitCode=\"C62\">{q}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID=\"{code}\">{}</cbc:LineExtensionAmount><cac:Item><cbc:Name>{}</cbc:Name><cac:SellersItemIdentification><cbc:ID>{}</cbc:ID></cac:SellersItemIdentification><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>{}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID=\"{code}\">{}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>",n+1,line.decimal(),xml(label),xml(sku),rate.unwrap(),unit.decimal()));
            } else if kind == "delivery_note" {
                x.push_str(&format!("<cac:DespatchLine><cbc:ID>{}</cbc:ID><cbc:DeliveredQuantity unitCode=\"C62\">{q}</cbc:DeliveredQuantity><cac:OrderLineReference><cbc:LineID>{}</cbc:LineID></cac:OrderLineReference><cac:Item><cbc:Name>{}</cbc:Name><cac:SellersItemIdentification><cbc:ID>{}</cbc:ID></cac:SellersItemIdentification></cac:Item></cac:DespatchLine>",n+1,n+1,xml(label),xml(sku)));
            } else {
                x.push_str(&format!("<cac:OrderLine><cbc:LineStatusCode>5</cbc:LineStatusCode><cac:LineItem><cbc:ID>{}</cbc:ID><cbc:Quantity unitCode=\"C62\">{q}</cbc:Quantity><cac:Item><cbc:Name>{}</cbc:Name><cac:SellersItemIdentification><cbc:ID>{}</cbc:ID></cac:SellersItemIdentification></cac:Item></cac:LineItem></cac:OrderLine>",n+1,xml(label),xml(sku)));
            }
        }
        x.push_str(&format!("</{root}>"));
        Ok(x)
    }
}
pub async fn handle(
    State(a): State<App>,
    h: HeaderMap,
    Json(v): Json<Input>,
) -> Result<Json<Value>> {
    let t = a.tenant(&h)?.to_owned();
    let _permit = a.capacity.clone().try_acquire_owned().map_err(|_| {
        error(
            StatusCode::TOO_MANY_REQUESTS,
            "EDI capacity exhausted; retry with backoff",
        )
    })?;
    Ok(Json(execute(&a, &t, v).await?))
}
#[cfg(test)]
#[path = "export_tests.rs"]
mod tests;
