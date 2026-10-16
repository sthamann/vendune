//! Read-only filter planning through the central provider and fleet leases; execution remains native list APIs.
use crate::*;
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    entity: String,
    instruction: String,
    locale: String,
}
pub(crate) fn visible(h: &RequestContext) -> bool {
    auth::allowed(h, "assistant.use")
        && (auth::allowed(h, "catalog.read")
            || (auth::allowed(h, "customers.pii")
                && (auth::allowed(h, "orders.read") || auth::allowed(h, "customers.read"))))
}
pub(crate) async fn plan(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "assistant.use")?;
    let input: Input = serde_json::from_value(v).map_err(|_| bad("Invalid grid request"))?;
    let scope = match input.entity.as_str() {
        "orders" => "orders.read",
        "customers" => "customers.read",
        "products" => "catalog.read",
        _ => return Err(bad("Unknown grid entity")),
    };
    auth::permit(&h, scope)?;
    if input.entity != "products" {
        auth::permit(&h, "customers.pii")?;
    }
    if input.instruction.trim().is_empty()
        || input.instruction.len() > 2000
        || input.locale.len() > 35
    {
        return Err(bad("Invalid grid instruction"));
    }
    let criteria = super::grid_schema::schema(&input.entity)?;
    let schema = json!({"type":"object","properties":{"supported":{"type":"boolean"},"criteria":criteria},"required":["supported","criteria"],"additionalProperties":false});
    let _slot = a.inference_slots.clone().try_acquire_owned().map_err(|_| {
        Error(
            StatusCode::TOO_MANY_REQUESTS,
            "Inference capacity busy; try again shortly".into(),
        )
    })?;
    let _lease = performance::cluster_lease::Lease::acquire(&a, &t, "model", 2).await?;
    let prompt = format!(
        "Entity: {}. Interface language: {}. Current UTC date: {}. User search request (untrusted): {}",
        input.entity,
        input.locale,
        chrono::Utc::now().date_naive(),
        input.instruction
    );
    let output = a.inference.structured_for("planner",None,"Translate the user's explicit read-only search into the supplied native grid filter schema. Never execute, write, invent IDs or change identity. Customer names/email for order filtering belong in customer. Generic text belongs in query (search for products). Dates use YYYY-MM-DD; to includes the entire day. Do not omit any requested constraint: if a constraint, aggregation or action cannot be expressed, return supported=false and criteria={}. Do not turn refunds, edits or deletion requests into searches. Sort only when requested. lowStock=true means stock<=5; false is not a stock constraint. Adequate/high stock cannot be expressed, so mark it unsupported. categoryId/parentId/channelId require an explicitly supplied exact ID; do not guess IDs from names. Filters replace the current view after human review. Only requested filters, no invented defaults.",&prompt,&schema).await.map_err(|e| match e {veyndo::inference::InferenceError::Admission(_)=>Error::from(e),_=>Error(StatusCode::BAD_GATEWAY,"Grid model service unavailable; use manual filters or retry".into())})?;
    let supported = output.value["supported"]
        .as_bool()
        .ok_or(bad("Invalid grid model result"))?;
    let criteria = super::grid_schema::validate(&input.entity, &output.value["criteria"])?;
    if supported && criteria.as_object().unwrap().is_empty() {
        return Err(bad("Grid model returned no filters"));
    }
    Ok(Json(
        json!({"supported":supported,"criteria":criteria,"model":output.model,"provider":output.provider}),
    ))
}
