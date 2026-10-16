//! Merchant catalogue intake prepares bounded drafts; approved saves reuse native products, history and outbox in a private stage.
use crate::*;
mod csv;
mod prepare;
mod save;
mod schema;
pub(crate) use schema::{CAPABILITIES, schema};
pub(crate) fn visible(h: &RequestContext, name: &str) -> bool {
    auth::allowed(h, "catalog.read")
        && (name == "merchant.catalog.context" || auth::allowed(h, "catalog.write"))
}
pub(crate) fn router() -> Router<App> {
    Router::new()
        .secure_route(
            "/api/merchant/catalog/intake",
            &[("GET", "catalog.read"), ("POST", "catalog.write")],
            get(context).post(prepare_route),
        )
        .secure_route(
            "/api/merchant/catalog/intake/save",
            &[("POST", "catalog.write")],
            post(save_route),
        )
        .layer(axum::extract::DefaultBodyLimit::max(300_000))
}
async fn context(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    Ok(Json(
        invoke(&a, &h, "merchant.catalog.context", &json!({})).await?,
    ))
}
async fn prepare_route(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, "merchant.catalog.prepare", &v).await?))
}
async fn save_route(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, "merchant.catalog.save", &v).await?))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    let t = merchant(a, h)?;
    if !visible(h, name) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Catalogue intake requires current catalogue permissions".into(),
        ));
    }
    apps::validate_native_input(
        &schema(name).ok_or(bad("Unknown catalogue intake operation"))?,
        v,
    )?;
    let (settings, settings_revision) = commerce::config(a, &t).await?;
    match name {
        "merchant.catalog.context" => Ok(
            json!({"mainLocale":settings.main_locale,"locales":settings.locales,"currency":settings.currencies.base_currency,"taxes":settings.taxes,"sandbox":staging::parent(a,&t).await?.is_some(),"settingsRevision":settings_revision}),
        ),
        "merchant.catalog.prepare" => {
            prepare::prepare(a, h, &t, &settings, settings_revision, v).await
        }
        "merchant.catalog.save" => save::save(a, h, &t, &settings, v).await,
        _ => Err(bad("Unknown catalogue intake operation")),
    }
}
#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Draft {
    pub name: String,
    pub description: String,
    pub price: f64,
    #[serde(default)]
    pub product_number: String,
    #[serde(default)]
    pub image_url: String,
}
impl Draft {
    fn validate(&self) -> Result<()> {
        if self.name.trim().is_empty()
            || self.name.len() > 200
            || self.description.len() > 4000
            || self.product_number.len() > 100
            || !self.price.is_finite()
            || !(0.0..=1_000_000.).contains(&self.price)
            || self.image_url.len() > 2000
        {
            return Err(bad(
                "Product draft needs a name, valid price and bounded description",
            ));
        }
        if !self.image_url.is_empty() {
            let url = reqwest::Url::parse(&self.image_url)
                .map_err(|_| bad("Invalid product image URL"))?;
            if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() {
                return Err(bad(
                    "Product images require a public HTTPS URL without credentials",
                ));
            }
            // DNS pinning is checked before returning remotely loaded image references too.
        }
        Ok(())
    }
}

/// Reuse DNS-pinned public egress while allowing product query parameters, never URL credentials or redirects.
pub(super) async fn public_client(url: &reqwest::Url) -> Result<reqwest::Client> {
    if !url.username().is_empty() || url.password().is_some() {
        return Err(bad("Product URL credentials are forbidden"));
    }
    let mut origin = url.clone();
    origin.set_query(None);
    origin.set_fragment(None);
    apps::public_https_client(&origin).await
}
