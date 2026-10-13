//! Explicit, additive Qdrant namespace migration and alias-aware projection deletion.
use super::vectors::request;
use reqwest::Method;
use serde_json::json;
use std::collections::{BTreeMap, BTreeSet};

fn namespace(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 32
        && value
            .bytes()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
        && value.as_bytes()[0].is_ascii_lowercase()
}
fn mapped(name: &str, from: &str) -> Option<(String, usize)> {
    let suffix = name.strip_prefix(&format!("{from}_"))?;
    let parts: Vec<_> = suffix.split('_').collect();
    if parts.len() != 4
        || !matches!(parts[0], "product" | "document")
        || parts[1] != "v2"
        || parts[2].len() != 16
        || !parts[2]
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
    {
        return None;
    }
    let dimensions: usize = parts[3].parse().ok()?;
    if !(1..=65536).contains(&dimensions) || dimensions.to_string() != parts[3] {
        return None;
    }
    Some((format!("sellama_{suffix}"), dimensions))
}
async fn collections() -> Result<BTreeSet<String>, String> {
    let data = request(Method::GET, "/collections", None).await?;
    data["result"]["collections"]
        .as_array()
        .ok_or("Invalid Qdrant collections")?
        .iter()
        .map(|c| {
            c["name"]
                .as_str()
                .map(str::to_owned)
                .ok_or_else(|| "Invalid Qdrant collection name".into())
        })
        .collect()
}
async fn aliases() -> Result<BTreeMap<String, String>, String> {
    let data = request(Method::GET, "/aliases", None).await?;
    data["result"]["aliases"]
        .as_array()
        .ok_or("Invalid Qdrant aliases")?
        .iter()
        .map(|a| {
            Ok((
                a["alias_name"]
                    .as_str()
                    .ok_or("Invalid Qdrant alias name")?
                    .into(),
                a["collection_name"]
                    .as_str()
                    .ok_or("Invalid Qdrant alias target")?
                    .into(),
            ))
        })
        .collect()
}
/// Run only in the explicit migration job. Keep physical collections and point IDs intact.
pub async fn migrate_configured() -> Result<usize, String> {
    let Ok(from) = std::env::var("QDRANT_NAMESPACE_MIGRATE_FROM") else {
        return Ok(0);
    };
    if from.is_empty() {
        return Ok(0);
    }
    if !namespace(&from) || from == "sellama" {
        return Err("Invalid prior Qdrant namespace".into());
    }
    let existing = collections().await?;
    let current_aliases = aliases().await?;
    let mut actions = Vec::new();
    for old in &existing {
        let Some((new, dimensions)) = mapped(old, &from) else {
            continue;
        };
        if existing.contains(&new)
            || current_aliases
                .get(&new)
                .is_some_and(|target| target != old)
        {
            return Err("Qdrant namespace collision; no aliases changed".into());
        }
        let info = request(Method::GET, &format!("/collections/{old}"), None).await?;
        let shape = &info["result"]["config"]["params"]["vectors"]["text"];
        if shape["size"] != dimensions || shape["distance"] != "Cosine" {
            return Err("Prior Qdrant collection shape mismatch; no aliases changed".into());
        }
        if !current_aliases.contains_key(&new) {
            actions.push(json!({"create_alias":{"collection_name":old,"alias_name":new}}));
        }
    }
    if actions.len() > 256 {
        return Err("Qdrant namespace migration exceeds collection limit".into());
    }
    let count = actions.len();
    if count > 0 {
        request(
            Method::POST,
            "/collections/aliases",
            Some(json!({"actions":actions})),
        )
        .await?;
    }
    // Reconcile ambiguous network outcomes on retry; never delete or replace an alias.
    let verified = aliases().await?;
    for old in &existing {
        if let Some((new, _)) = mapped(old, &from)
            && verified.get(&new) != Some(old)
        {
            return Err("Qdrant namespace alias verification failed".into());
        }
    }
    Ok(count)
}
pub(super) async fn names(kind: &str) -> Result<BTreeSet<String>, String> {
    if !matches!(kind, "product" | "document") {
        return Err("Invalid vector kind".into());
    }
    let mut result = collections().await?;
    result.extend(aliases().await?.into_keys());
    result.retain(|name| {
        name.starts_with(&format!("sellama_{kind}_")) && mapped(name, "sellama").is_some()
    });
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn namespace_mapping_is_versioned_and_cannot_capture_foreign_or_unsafe_names() {
        let valid = "legacy_product_v2_0123456789abcdef_768";
        assert_eq!(
            mapped(valid, "legacy"),
            Some(("sellama_product_v2_0123456789abcdef_768".into(), 768))
        );
        for value in [
            "../legacy",
            "Legacy",
            "",
            "legacy/collections",
            "legacy?",
            "legacy_",
        ] {
            assert!(!namespace(value));
        }
        for value in [
            "foreign_product_v2_0123456789abcdef_768",
            "legacy_orders_v2_0123456789abcdef_768",
            "legacy_product_v1_0123456789abcdef_768",
            "legacy_product_v2_0123456789ABCDEf_768",
            "legacy_product_v2_0123456789abcdef_0768",
            "legacy_product_v2_0123456789abcdef_0",
        ] {
            assert!(mapped(value, "legacy").is_none());
        }
    }
}
