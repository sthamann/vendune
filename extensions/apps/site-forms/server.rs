//! Forms validate answers against a published page's declared fields; inbox entries stay private.
use super::*;
pub(super) async fn admit(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    t: &str,
    channel: &str,
    v: &Value,
) -> Result<()> {
    let fields = &v["fields"];
    if fields["channel"] != channel || fields["consent"] != true {
        return Err(bad("Form channel and privacy acknowledgement required"));
    }
    let m = sqlx::query_scalar::<_, Value>(
        "SELECT manifest FROM app_packages WHERE tenant=$1 AND id='site_builder' AND active",
    )
    .bind(t)
    .fetch_optional(&mut **tx)
    .await?
    .ok_or(bad("Shop pages are unavailable"))?;
    let _: Manifest = serde_json::from_value(m).map_err(|_| bad("Invalid page package"))?;
    sqlx::query("SELECT set_config('rac.tenant',$1,true)")
        .bind(t)
        .execute(&mut **tx)
        .await?;
    let content = sqlx::query_scalar::<_, Value>("SELECT fields->'content' FROM app_records WHERE tenant=$1 AND app='site_builder' AND entity='pages' AND id=$2 AND fields->>'status'='published' AND (fields->>'channel'='*' OR fields->>'channel'=$3) AND (fields->>'starts_at' IS NULL OR (fields->>'starts_at')::timestamptz<=now())")
        .bind(t)
        .bind(fields["page"].as_str().ok_or(bad("Page required"))?)
        .bind(channel)
        .fetch_optional(&mut **tx)
        .await?
        .ok_or(bad("This form is not published in this channel"))?;
    let content: Document =
        serde_json::from_value(content).map_err(|_| bad("Invalid form definition"))?;
    let block = content
        .blocks
        .iter()
        .find(|b| b.kind == "form" && Some(b.id.as_str()) == fields["block"].as_str())
        .ok_or(bad("Form block not found"))?;
    answers(&block.fields, &fields["answers"])
}
fn answers(definition: &[Field], v: &Value) -> Result<()> {
    let answers = v.as_object().ok_or(bad("Form answers required"))?;
    if answers
        .keys()
        .any(|id| !definition.iter().any(|f| f.id == *id))
    {
        return Err(bad("Unknown form field"));
    }
    for f in definition {
        let value = &v[&f.id];
        if value.is_null() || value.as_str() == Some("") || value == false {
            if f.required {
                return Err(bad(format!("{} is required", f.id)));
            } else {
                continue;
            }
        }
        let valid = match f.kind.as_str() {
            "checkbox" => value.is_boolean(),
            "number" => value.as_f64().is_some_and(f64::is_finite),
            "email" => value.as_str().is_some_and(|s| {
                s.len() <= 254
                    && s.split_once('@')
                        .is_some_and(|(a, b)| !a.is_empty() && b.contains('.'))
            }),
            _ => value.as_str().is_some_and(|s| s.len() <= 2000),
        };
        if !valid {
            return Err(bad(format!("Invalid form field {}", f.id)));
        }
    }
    Ok(())
}

// The published document wire contract is consumed as data, without importing another app's implementation.
#[derive(Deserialize)]
struct Document {
    blocks: Vec<Section>,
}
#[derive(Deserialize)]
struct Section {
    id: String,
    kind: String,
    #[serde(default)]
    fields: Vec<Field>,
}
#[derive(Deserialize)]
struct Field {
    id: String,
    kind: String,
    required: bool,
}
