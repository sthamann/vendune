//! Mapped partner documents create private native requisitions, never orders or a second pricing ledger.
use super::*;
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Input {
    pub partner_id: String,
    pub format: String,
    pub document: String,
}
pub async fn execute(a: &App, t: &str, input: Input) -> Result<Value> {
    let d = document::parse(&input.format, &input.document)
        .map_err(|e| error(StatusCode::UNPROCESSABLE_ENTITY, &e))?;
    if serde_json::to_vec(&d).unwrap().len() > 7000 {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Normalized document exceeds app record limit; split the order",
        ));
    }
    let records = a
        .record(
            t,
            "list_partners",
            json!({"filter":{"partner_id":input.partner_id},"limit":2}),
        )
        .await?;
    let partners = records["elements"]
        .as_array()
        .ok_or(error(StatusCode::BAD_GATEWAY, "Invalid partner callback"))?;
    if partners.len() != 1 {
        return Err(error(
            StatusCode::NOT_FOUND,
            "Configure one active partner mapping in the EDI app first",
        ));
    }
    let p = &partners[0];
    if p["active"] != true
        || p["format"] != input.format
        || p["sender_id"] != d.sender
        || p["receiver_id"] != d.receiver
    {
        return Err(error(
            StatusCode::FORBIDDEN,
            "Document envelope differs from the approved active partner mapping",
        ));
    }
    let unit = p["unit_id"].as_str().ok_or(error(
        StatusCode::BAD_GATEWAY,
        "Partner purchasing unit missing",
    ))?;
    let buyer = p["buyer_id"]
        .as_str()
        .ok_or(error(StatusCode::BAD_GATEWAY, "Partner buyer missing"))?;
    let key = hash(
        &json!([
            input.partner_id,
            input.format,
            d.sender,
            d.receiver,
            d.number
        ])
        .to_string(),
    );
    let source = hash(&input.document);
    let old = a
        .record(
            t,
            "list_messages",
            json!({"filter":{"external_key":key},"limit":2}),
        )
        .await?;
    if let Some(row) = old["elements"].as_array().and_then(|rows| rows.first())
        && (row["source_hash"] != source || row["unit_id"] != unit || row["buyer_id"] != buyer)
    {
        return Err(error(
            StatusCode::CONFLICT,
            "Document number was already imported with different content or mapping",
        ));
    }
    let settings=a.callback(t,"b2b_requisition",json!({"id":format!("edi_{}", &key[..28]),"unitId":unit,"customerId":buyer,"data":{"name":p["name"],"currency":d.currency,"lines":d.lines}})).await?;
    // No second queue: the installed app's ordinary CAS record and outbox owner persist this receipt.
    let fields = json!({"external_key":key,"source_hash":source,"partner_id":input.partner_id,"unit_id":unit,"buyer_id":buyer,"number":d.number,"format":input.format,"document":d,"requisition_id":settings["id"]});
    let revision = old["elements"]
        .as_array()
        .and_then(|r| r.first())
        .and_then(|r| r["revision"].as_i64())
        .unwrap_or(0);
    if revision == 0 {
        a.record(
            t,
            "save_messages",
            json!({"id":key,"revision":revision,"fields":fields}),
        )
        .await?;
    }
    Ok(
        json!({"requisitionId":settings["id"],"replayed":settings["replayed"],"documentNumber":d.number,"state":"requisition","warnings":["Partner prices and totals are informational. Native prices, taxes, stock and company approvals apply when the buyer checks out."]}),
    )
}
