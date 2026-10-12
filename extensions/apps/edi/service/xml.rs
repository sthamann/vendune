//! Namespace-aware UBL Order and cXML OrderRequest ingestion without DTDs, external entities or network fetching.
use super::document::{Document, Line, Result, quantity};
const CBC: &str = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
const CAC: &str = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
fn child<'a, 'd>(
    n: roxmltree::Node<'a, 'd>,
    ns: Option<&str>,
    tag: &str,
) -> Result<roxmltree::Node<'a, 'd>> {
    let mut nodes = n
        .children()
        .filter(|c| c.is_element() && c.tag_name().name() == tag && c.tag_name().namespace() == ns);
    let v = nodes.next().ok_or(format!("Missing {tag}"))?;
    if nodes.next().is_some() {
        return Err(format!("Duplicate {tag}"));
    }
    Ok(v)
}
fn text(n: roxmltree::Node<'_, '_>) -> Result<String> {
    let s = n.text().unwrap_or("").trim();
    if s.is_empty() {
        return Err("Empty XML value".into());
    }
    Ok(s.into())
}
pub fn parse(format: &str, s: &str) -> Result<Document> {
    let doc = roxmltree::Document::parse_with_options(
        s,
        roxmltree::ParsingOptions {
            allow_dtd: false,
            nodes_limit: 4000,
            ..Default::default()
        },
    )
    .map_err(|_| "Invalid/oversized XML, DTDs and external entities are not supported")?;
    let r = doc.root_element();
    let d = if format == "ubl" {
        if r.tag_name().name() != "Order"
            || r.tag_name().namespace()
                != Some("urn:oasis:names:specification:ubl:schema:xsd:Order-2")
        {
            return Err("Expected UBL 2 Order namespace".into());
        }
        let party = |tag| -> Result<String> {
            text(child(
                child(
                    child(child(r, Some(CAC), tag)?, Some(CAC), "Party")?,
                    Some(CAC),
                    "PartyIdentification",
                )?,
                Some(CBC),
                "ID",
            )?)
        };
        let mut lines = vec![];
        for line in r.children().filter(|n| {
            n.is_element()
                && n.tag_name().namespace() == Some(CAC)
                && n.tag_name().name() == "OrderLine"
        }) {
            let item = child(line, Some(CAC), "LineItem")?;
            let q = child(item, Some(CBC), "Quantity")?;
            if ![Some("EA"), Some("C62"), Some("H87")].contains(&q.attribute("unitCode")) {
                return Err("Only each/piece units are supported".into());
            }
            let sku = text(child(
                child(
                    child(item, Some(CAC), "Item")?,
                    Some(CAC),
                    "SellersItemIdentification",
                )?,
                Some(CBC),
                "ID",
            )?)?;
            lines.push(Line {
                sku,
                quantity: quantity(&text(q)?)?,
            });
        }
        Document {
            number: text(child(r, Some(CBC), "ID")?)?,
            currency: text(child(r, Some(CBC), "DocumentCurrencyCode")?)?,
            sender: party("BuyerCustomerParty")?,
            receiver: party("SellerSupplierParty")?,
            lines,
        }
    } else {
        if r.tag_name().name() != "cXML" || r.tag_name().namespace().is_some() {
            return Err("Expected cXML envelope".into());
        }
        let head = child(r, None, "Header")?;
        let credential = |tag| -> Result<String> {
            text(child(
                child(child(head, None, tag)?, None, "Credential")?,
                None,
                "Identity",
            )?)
        };
        let order = child(child(r, None, "Request")?, None, "OrderRequest")?;
        let header = child(order, None, "OrderRequestHeader")?;
        if ![None, Some("new")].contains(&header.attribute("type")) {
            return Err("Only original cXML orders are supported".into());
        }
        let mut lines = vec![];
        for l in order
            .children()
            .filter(|n| n.is_element() && n.tag_name().name() == "ItemOut")
        {
            let detail = child(l, None, "ItemDetail")?;
            if text(child(detail, None, "UnitOfMeasure")?)? != "EA" {
                return Err("Only EA quantities are supported".into());
            }
            lines.push(Line {
                sku: text(child(child(l, None, "ItemID")?, None, "SupplierPartID")?)?,
                quantity: quantity(l.attribute("quantity").ok_or("Quantity required")?)?,
            });
        }
        Document {
            number: header
                .attribute("orderID")
                .ok_or("Order ID required")?
                .into(),
            currency: child(child(header, None, "Total")?, None, "Money")?
                .attribute("currency")
                .ok_or("Currency required")?
                .into(),
            sender: credential("From")?,
            receiver: credential("To")?,
            lines,
        }
    };
    d.validate()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ubl() {
        let s = include_str!("../fixtures/order.xml");
        assert_eq!(parse("ubl", s).unwrap().lines[0].quantity, 2);
        assert!(parse("ubl", &s.replace("unitCode=\"EA\"", "unitCode=\"KGM\"")).is_err());
        assert!(
            parse(
                "ubl",
                &s.replace(
                    "<cbc:ID>PO-100</cbc:ID>",
                    "<cbc:ID>A</cbc:ID><cbc:ID>B</cbc:ID>"
                )
            )
            .is_err()
        );
    }
    #[test]
    fn cxml() {
        assert_eq!(
            parse("cxml", include_str!("../fixtures/order.cxml"))
                .unwrap()
                .sender,
            "BUYER"
        );
        assert!(
            parse(
                "cxml",
                "<!DOCTYPE cXML SYSTEM 'https://invalid.test/x'><cXML/>"
            )
            .is_err()
        );
        assert!(parse("cxml", "<!DOCTYPE cXML [<!ENTITY a 'x'>]><cXML>&a;</cXML>").is_err());
    }
}
