//! Publish only the operator-configured verified identity recovery entry; browsers cannot choose a broker.
use crate::*;
pub(crate) async fn entry() -> Result<Json<Value>> {
    let configured = env::var("IDENTITY_BROKER_KEY").is_ok_and(|k| k.len() >= 64)
        && env::var("IDENTITY_BROKER_ISSUER").is_ok();
    let url = env::var("IDENTITY_RECOVERY_URL")
        .unwrap_or_else(|_| "https://start.veyndo.ai/recover".into());
    let valid = reqwest::Url::parse(&url).is_ok_and(|u| {
        u.scheme() == "https"
            && u.host_str().is_some()
            && u.username().is_empty()
            && u.password().is_none()
            && u.query().is_none()
            && u.fragment().is_none()
    });
    Ok(Json(
        json!({"available":configured&&valid,"url":if configured&&valid {Some(url)}else{None}}),
    ))
}
