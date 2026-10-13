//! RFQ lifecycle binds merchant offers to a specific company buyer, cart, currency, expiry and revision.
use super::*;
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct OfferLine {
    pub id: String,
    pub quantity: u32,
    pub gross_minor: u64,
}
pub(super) async fn invoke(a: &App, h: &RequestContext, op: &str, v: &Value) -> Result<Value> {
    let t = tenant(h)?;
    let admin = op == "quotes.merchant" || op == "quote.offer";
    if admin {
        merchant(a, h)?;
        auth::permit(h, "b2b.manage")?;
    }
    let c = if ["quote.request", "quote.get", "quote.current"].contains(&op) {
        Some(load_cart(a, h).await?)
    } else {
        None
    };
    let q = if let Some(c) = c.as_ref().filter(|_| op == "quote.request") {
        {
            let mut snapshot = cart_json(a, c).await?;
            if let Some(v) = snapshot.as_object_mut() {
                v.remove("token");
            }
            Some(snapshot)
        }
    } else {
        None
    };
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.procurement").await?;
    let customer = if admin {
        None
    } else {
        Some(identity(&mut tx, h).await?)
    };
    if let Some(customer) = &customer {
        history::customer_context(&mut tx, customer).await?;
    }
    if op == "quotes.merchant" {
        auth::permit(h, "customers.pii")?;
        let rows=sqlx::query("SELECT id,unit_id,buyer_id,state,revision,data FROM b2b_quotes WHERE tenant=$1 ORDER BY created_at DESC LIMIT 100").bind(&t).fetch_all(&mut *tx).await?;
        return Ok(json!({"elements":rows.iter().map(wire).collect::<Vec<_>>()}));
    }
    if op == "quotes" {
        let unit = v["unitId"].as_str().ok_or(bad("Unit required"))?;
        let policy = access(&mut tx, &t, unit, customer.as_ref().unwrap()).await?;
        require(&policy, "quotes")?;
        let rows=sqlx::query("SELECT id,unit_id,buyer_id,state,revision,data FROM b2b_quotes WHERE tenant=$1 AND unit_id=$2 AND buyer_id=$3 ORDER BY created_at DESC LIMIT 100").bind(&t).bind(unit).bind(customer).fetch_all(&mut *tx).await?;
        return Ok(json!({"elements":rows.iter().map(wire).collect::<Vec<_>>()}));
    }
    if ["quote.get", "quote.current"].contains(&op) {
        let c = c.as_ref().unwrap();
        let policy = guard_conn(&mut tx, h, c)
            .await?
            .ok_or(bad("Select a purchasing unit first"))?;
        require(&policy, "quotes")?;
        let context = c.data.b2b.as_ref().unwrap();
        let id = if op == "quote.get" {
            Some(v["id"].as_str().ok_or(bad("Quote required"))?)
        } else {
            None
        };
        let rows = sqlx::query("SELECT id,unit_id,buyer_id,state,revision,data FROM b2b_quotes WHERE tenant=$1 AND cart_id=$2 AND buyer_id=$3 AND unit_id=$4 AND ($5::text IS NULL OR id=$5) ORDER BY created_at DESC,id DESC LIMIT 20")
            .bind(&t).bind(&c.id).bind(&context.customer_id).bind(&context.unit_id).bind(id).fetch_all(&mut *tx).await?;
        if op == "quote.get" {
            return rows.first().map(wire).ok_or(Error(
                StatusCode::NOT_FOUND,
                "Quote not found in this cart".into(),
            ));
        }
        return Ok(json!({"elements":rows.iter().map(wire).collect::<Vec<_>>(),"limit":20}));
    }
    if let Some(c) = &c {
        if c.status != "open"
            || c.data.items.is_empty()
            || v["revision"].as_i64() != Some(c.revision)
        {
            return Err(conflict("Review a current nonempty company cart first"));
        }
        let revision: Option<i64> = sqlx::query_scalar(
            "SELECT revision FROM carts WHERE tenant=$1 AND id=$2 AND status='open' FOR SHARE",
        )
        .bind(&t)
        .bind(&c.id)
        .fetch_optional(&mut *tx)
        .await?;
        if revision != Some(c.revision) {
            return Err(conflict("Cart changed; request a new quote"));
        }
        let policy = guard_conn(&mut tx, h, c)
            .await?
            .ok_or(bad("Select a purchasing unit first"))?;
        require(&policy, "quotes")?;
        if c.data.b2b.as_ref().is_some_and(|b| b.quote_id.is_some()) {
            return Err(conflict(
                "Release the accepted quote before requesting another",
            ));
        }
        let id = uid();
        let context = c.data.b2b.as_ref().unwrap();
        sqlx::query("INSERT INTO b2b_quotes(tenant,id,unit_id,buyer_id,cart_id,data) VALUES($1,$2,$3,$4,$5,$6)").bind(&t).bind(&id).bind(&context.unit_id).bind(&context.customer_id).bind(&c.id).bind(json!({"quote":q,"currency":c.data.currency,"items":c.data.items,"message":message(v)?,"messages":[]})).execute(&mut *tx).await?;
        organization::event(
            &mut tx,
            &t,
            "b2b.quote_requested",
            json!({"quoteId":id,"unitId":context.unit_id}),
        )
        .await?;
        tx.commit().await?;
        return Ok(json!({"id":id,"revision":1,"state":"requested"}));
    }
    let id = v["id"].as_str().ok_or(bad("Quote required"))?;
    if !admin {
        let metadata: Option<(String, String)> =
            sqlx::query_as("SELECT unit_id,buyer_id FROM b2b_quotes WHERE tenant=$1 AND id=$2")
                .bind(&t)
                .bind(id)
                .fetch_optional(&mut *tx)
                .await?;
        let (unit, buyer) =
            metadata.ok_or(Error(StatusCode::NOT_FOUND, "Quote not found".into()))?;
        if customer.as_deref() != Some(&buyer) {
            return Err(Error(StatusCode::NOT_FOUND, "Quote not found".into()));
        }
        let policy = access(&mut tx, &t, &unit, &buyer).await?;
        require(&policy, "quotes")?;
    }
    let r=sqlx::query("SELECT unit_id,buyer_id,state,revision,data,cart_id FROM b2b_quotes WHERE tenant=$1 AND id=$2 FOR UPDATE").bind(&t).bind(id).fetch_optional(&mut *tx).await?.ok_or(Error(StatusCode::NOT_FOUND,"Quote not found".into()))?;
    let buyer: String = r.get("buyer_id");
    let state: String = r.get("state");
    let revision: i64 = r.get("revision");
    if v["revision"].as_i64() != Some(revision) {
        return Err(conflict("Quote changed; reload before editing"));
    }
    let mut data: Value = r.get("data");
    let next = match op {
        "quote.offer" => {
            if !["requested", "offered"].contains(&state.as_str()) {
                return Err(conflict("This quote cannot be revised"));
            }
            let lines: Vec<OfferLine> = serde_json::from_value(v["data"]["lines"].clone())
                .map_err(|_| bad("Expected offer lines with grossMinor in the quote currency"))?;
            let original: Vec<Item> = serde_json::from_value(data["items"].clone())
                .map_err(|_| bad("Invalid requested items"))?;
            if lines.len() != original.len()
                || lines.len() > 100
                || lines.iter().any(|l| {
                    l.gross_minor > 1_000_000_000_000
                        || !original
                            .iter()
                            .any(|i| i.id == l.id && i.quantity == l.quantity)
                })
                || lines
                    .iter()
                    .map(|l| &l.id)
                    .collect::<std::collections::HashSet<_>>()
                    .len()
                    != lines.len()
            {
                return Err(bad(
                    "Offer must cover the exact requested items and quantities",
                ));
            }
            let until = v["data"]["validUntil"]
                .as_str()
                .ok_or(bad("Offer expiry required"))?;
            chrono::DateTime::parse_from_rfc3339(until)
                .map_err(|_| bad("Offer expiry must be an RFC3339 timestamp"))?;
            let valid: bool = sqlx::query_scalar(
                "SELECT $1::timestamptz>now() AND $1::timestamptz<now()+interval '1 year'",
            )
            .bind(until)
            .fetch_one(&mut *tx)
            .await?;
            if !valid {
                return Err(bad("Offer expires within the next year"));
            }
            data["lines"] = json!(lines);
            data["validUntil"] = json!(until);
            "offered"
        }
        "quote.message" => {
            if !["requested", "offered"].contains(&state.as_str()) {
                return Err(conflict("Quote is closed"));
            }
            state.as_str()
        }
        "quote.reject" => {
            if !["requested", "offered"].contains(&state.as_str()) {
                return Err(conflict("Quote is closed"));
            }
            "rejected"
        }
        _ => return Err(bad("Unknown quote operation")),
    };
    let messages = data["messages"]
        .as_array_mut()
        .ok_or(bad("Invalid quote conversation"))?;
    if messages.len() >= 100 {
        return Err(bad("Quote conversation is full"));
    }
    messages.push(json!({"actor":if admin{header(h,"x-rac-user").unwrap_or("merchant")}else{&buyer},"merchant":admin,"message":message(v)?,"operation":op,"createdAt":chrono::Utc::now().to_rfc3339()}));
    sqlx::query(
        "UPDATE b2b_quotes SET state=$3,revision=revision+1,data=$4 WHERE tenant=$1 AND id=$2",
    )
    .bind(&t)
    .bind(id)
    .bind(next)
    .bind(data)
    .execute(&mut *tx)
    .await?;
    organization::event(
        &mut tx,
        &t,
        "b2b.quote_changed",
        json!({"quoteId":id,"state":next,"revision":revision+1}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"id":id,"state":next,"revision":revision+1}))
}
fn message(v: &Value) -> Result<&str> {
    let s = v["message"].as_str().unwrap_or("");
    if s.len() > 4000
        || s.chars()
            .any(|c| c.is_control() && !['\n', '\t', '\r'].contains(&c))
    {
        return Err(bad("Quote message is invalid or too long"));
    }
    Ok(s)
}
fn wire(r: &sqlx::postgres::PgRow) -> Value {
    json!({"id":r.get::<String,_>("id"),"unitId":r.get::<String,_>("unit_id"),"buyerId":r.get::<String,_>("buyer_id"),"state":r.get::<String,_>("state"),"revision":r.get::<i64,_>("revision"),"data":r.get::<Value,_>("data")})
}
