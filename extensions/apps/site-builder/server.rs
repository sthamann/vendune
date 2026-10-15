//! Standard-shop page contract. App-owned content and theme validation; no HTML, CSS or script evaluation.
use super::*;
mod context;
pub(crate) mod design_agent;
mod elements;
pub(crate) fn router() -> Router<App> {
    Router::new()
        .merge(context::router())
        .merge(design_agent::router())
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Content {
    pub blocks: Vec<Block>,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Block {
    pub id: String,
    pub kind: String,
    #[serde(default)]
    pub text: HashMap<String, Option<String>>,
    #[serde(default)]
    pub rich: Value,
    #[serde(default)]
    pub image: String,
    #[serde(default)]
    pub products: Vec<String>,
    #[serde(default)]
    pub product_mode: Option<String>,
    #[serde(default)]
    pub fields: Vec<FormField>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extension: Option<ElementRef>,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ElementRef {
    pub app: String,
    pub surface: String,
}
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct FormField {
    pub id: String,
    pub kind: String,
    pub required: bool,
    pub label: HashMap<String, String>,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Theme {
    accent: Option<String>,
    background: Option<String>,
    foreground: Option<String>,
    font: Option<String>,
    radius: Option<u8>,
    spacing: Option<u8>,
    columns: Option<u8>,
}
pub(crate) fn normalize(v: &Value) -> Result<Value> {
    let mut next = v.clone();
    let content: Content =
        serde_json::from_value(next["content"].clone()).map_err(|_| bad("Invalid page blocks"))?;
    next["content"] = serde_json::to_value(content).map_err(|_| bad("Invalid page blocks"))?;
    Ok(next)
}
pub(crate) fn validate(entity: &str, v: &Value) -> Result<()> {
    if entity != "pages" {
        return Err(bad("Unknown site model"));
    }
    let content: Content =
        serde_json::from_value(v["content"].clone()).map_err(|_| bad("Invalid page blocks"))?;
    let theme: Theme =
        serde_json::from_value(v["theme"].clone()).map_err(|_| bad("Invalid shop theme"))?;
    let slug = v["slug"].as_str().unwrap_or("");
    if slug.is_empty()
        || slug.len() > 100
        || !slug
            .bytes()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
        || content.blocks.len() > 24
    {
        return Err(bad("Use a lowercase page slug and at most 24 blocks"));
    }
    let mut ids = std::collections::HashSet::new();
    for b in &content.blocks {
        if !identifier(&b.id)
            || !ids.insert(&b.id)
            || ![
                "hero", "text", "products", "image", "form", "articles", "app",
            ]
            .contains(&b.kind.as_str())
            || (b.kind == "app") != b.extension.is_some()
            || b.extension.as_ref().is_some_and(|e| {
                !identifier(&e.app) || !identifier(&e.surface) || e.app == "site_builder"
            })
            || b.text.len() > 100
            || b.text.iter().any(|(k, v)| {
                !commerce::valid_locale_key(k) || v.as_ref().is_some_and(|s| s.len() > 2000)
            })
            || b.product_mode
                .as_deref()
                .is_some_and(|m| !["all", "selected"].contains(&m))
            || b.products.len() > 24
            || b.products.iter().any(|s| s.len() > 100)
            || b.fields.len() > 12
        {
            return Err(bad("Invalid page block, translation or product selection"));
        }
        if !b.rich.is_null() {
            assets::validate_rich(&b.rich)?;
        }
        if !b.image.is_empty() && !safe_image(&b.image) {
            return Err(bad(
                "Image must be a public product-media path or HTTPS URL",
            ));
        }
        let mut fields = std::collections::HashSet::new();
        for f in &b.fields {
            if !identifier(&f.id)
                || !fields.insert(&f.id)
                || !["text", "email", "textarea", "checkbox", "number"].contains(&f.kind.as_str())
                || f.label.is_empty()
                || f.label.len() > 100
                || f.label
                    .iter()
                    .any(|(l, s)| !commerce::valid_locale_key(l) || s.len() > 100)
            {
                return Err(bad("Invalid form field"));
            }
        }
    }
    for c in [theme.accent, theme.background, theme.foreground]
        .into_iter()
        .flatten()
    {
        if c.len() != 7
            || !c.starts_with('#')
            || !c.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)
        {
            return Err(bad("Theme colors require #RRGGBB"));
        }
    }
    if theme
        .font
        .as_ref()
        .is_some_and(|f| !["sans", "serif", "mono"].contains(&f.as_str()))
        || theme.radius.is_some_and(|n| n > 32)
        || theme.spacing.is_some_and(|n| !(12..=96).contains(&n))
        || theme.columns.is_some_and(|n| !(1..=4).contains(&n))
    {
        return Err(bad("Theme values exceed design bounds"));
    }
    Ok(())
}
fn safe_image(s: &str) -> bool {
    (s.starts_with("/store-api/") && !s.contains(['\\', '\r', '\n']))
        || reqwest::Url::parse(s).is_ok_and(|u| {
            u.scheme() == "https" && u.username().is_empty() && u.password().is_none()
        })
}
pub(crate) async fn validate_owned(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    t: &str,
    v: &Value,
    record_id: &str,
) -> Result<()> {
    let channel = v["channel"].as_str().ok_or(bad("Page channel required"))?;
    if channel != "*"
        && !sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM sales_channels WHERE tenant=$1 AND id=$2)",
        )
        .bind(t)
        .bind(channel)
        .fetch_one(&mut **tx)
        .await?
    {
        return Err(bad("Page channel does not belong to this shop"));
    }
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,947))")
        .bind(format!("{t}:site_routes"))
        .execute(&mut **tx)
        .await?;
    sqlx::query("SELECT set_config('rac.tenant',$1,true)")
        .bind(t)
        .execute(&mut **tx)
        .await?;
    let route_sql = format!(
        "SELECT EXISTS(SELECT 1 FROM public.{} WHERE tenant=$1 AND channel=$2 AND slug=$3 AND id<>$4)",
        table(t, "site_builder", "pages")
    );
    if sqlx::query_scalar::<_, bool>(sqlx::AssertSqlSafe(route_sql.as_str()))
        .bind(t)
        .bind(channel)
        .bind(v["slug"].as_str())
        .bind(record_id)
        .fetch_one(&mut **tx)
        .await?
    {
        return Err(conflict("A page already uses this address in this channel"));
    }
    let settings: Value = sqlx::query_scalar("SELECT data FROM commerce_settings WHERE tenant=$1")
        .bind(t)
        .fetch_one(&mut **tx)
        .await?;
    let settings = commerce::decode_config(settings)?;
    let content: Content =
        serde_json::from_value(v["content"].clone()).map_err(|_| bad("Invalid page"))?;
    for b in content.blocks {
        if let Some(element) = &b.extension {
            elements::validate_owned(tx, t, element).await?;
        }
        let mut languages = b.text.keys().cloned().collect::<Vec<_>>();
        if let Some(rich) = b.rich.as_object() {
            languages.extend(rich.keys().cloned());
        }
        for f in &b.fields {
            languages.extend(f.label.keys().cloned());
        }
        if languages.iter().any(|k| {
            !settings
                .locales
                .iter()
                .any(|l| l == k || l.split('-').next() == Some(k.as_str()))
        }) {
            return Err(bad(
                "Page translation language is not enabled for this shop",
            ));
        }

        for id in b.products {
            if !sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM products WHERE tenant=$1 AND id=$2)",
            )
            .bind(t)
            .bind(id)
            .fetch_one(&mut **tx)
            .await?
            {
                return Err(bad("Page product does not belong to this shop"));
            }
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn page_rejects_scripts_unbounded_theme_and_duplicate_ids() {
        let mut v = json!({"slug":"home","content":{"blocks":[]},"theme":{}});
        assert!(validate("pages", &v).is_ok());
        v["theme"]["accent"] = json!("url(javascript:alert(1))");
        assert!(validate("pages", &v).is_err());
        v["theme"] = json!({});
        v["content"]["blocks"] = json!([{"id":"x","kind":"image","image":"javascript:alert(1)"}]);
        assert!(validate("pages", &v).is_err());
    }
}
