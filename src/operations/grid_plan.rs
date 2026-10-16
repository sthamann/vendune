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
    let object = match input.entity.as_str() {
        "products" => apps::core_extensions::Object::Product,
        "customers" => apps::core_extensions::Object::Customer,
        _ => apps::core_extensions::Object::Order,
    };
    let fields = apps::core_extensions::descriptions(&a, &h, object).await?;
    let prompt=json!({"entity":input.entity,"interfaceLanguage":input.locale,"currentDate":chrono::Utc::now().date_naive().to_string(),"registeredAppFields":fields,"userRequest":input.instruction}).to_string();
    let output = a
        .inference
        .structured_for(
            "planner",
            None,
            include_str!("../../crates/cognition/prompts/grid-filter.v1.txt"),
            &prompt,
            &schema,
        )
        .await
        .map_err(|e| match e {
            veyndo::inference::InferenceError::Admission(_) => Error::from(e),
            _ => Error(
                StatusCode::BAD_GATEWAY,
                "Grid model service unavailable; use manual filters or retry".into(),
            ),
        })?;
    let supported = output.value["supported"]
        .as_bool()
        .ok_or(bad("Invalid grid model result"))?;
    let criteria = super::grid_schema::validate(&input.entity, &output.value["criteria"])?;
    if let Some(filter) = criteria["appFilter"].as_str() {
        apps::extension_filter::admit(&a, &h, object, filter).await?;
    }
    if supported && criteria.as_object().unwrap().is_empty() {
        return Err(bad("Grid model returned no filters"));
    }
    Ok(Json(
        json!({"supported":supported,"criteria":criteria,"model":output.model,"provider":output.provider,"promptId":"grid-filter@1"}),
    ))
}
