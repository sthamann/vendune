//! Bounded RFC 6902 edits modify the canonical Manifest; this is model wire adaptation, not an app runtime.
use super::*;

pub(super) fn system(locales: &[String]) -> String {
    let manifest = generation::schema_for(locales)["properties"]["manifest"].clone();
    format!(
        include_str!("../../crates/cognition/prompts/app-edit.v3.txt"),
        manifest["properties"]["entities"],
        manifest["properties"]["views"],
        manifest["properties"]["surfaces"],
        manifest["properties"]["lifecycles"]
    )
}

pub(super) fn schema(locales: &[String]) -> Value {
    let summary = generation::schema_for(locales)["properties"]["summary"].clone();
    json!({"type":"object","additionalProperties":false,"required":["summary","patch"],"properties":{
    "summary":summary,"patch":{"type":"array","minItems":1,"maxItems":64,"items":{
        "type":"object","additionalProperties":false,"required":["op","path","valueJson"],"properties":{
            "op":{"type":"string","enum":["add","replace"]},"path":{"type":"string"},
            "valueJson":{"type":"string","description":"JSON-encode the exact replacement value, including quotes for a string. The host decodes this into the RFC 6902 value."}
        }}}}})
}

pub(super) fn apply(old: &Value, output: &Value, versions: &Value) -> Result<Value> {
    let edits = output["patch"]
        .as_array()
        .filter(|p| !p.is_empty() && p.len() <= 64)
        .ok_or(bad("AI must propose between 1 and 64 app edits"))?;
    if output.to_string().len() > 65536 {
        return Err(bad("AI app edits exceed 64 KiB"));
    }
    let mut operations = Vec::new();
    for edit in edits {
        let path = edit["path"]
            .as_str()
            .ok_or(bad("AI edit needs a JSON pointer"))?;
        let root = path
            .strip_prefix('/')
            .and_then(|s| s.split('/').next())
            .unwrap_or("");
        if ![
            "entities",
            "views",
            "surfaces",
            "name",
            "presentation",
            "permissions",
            "apiRoutes",
            "intelligence",
            "slots",
            "lifecycles",
        ]
        .contains(&root)
            || !matches!(edit["op"].as_str(), Some("add" | "replace"))
        {
            return Err(bad(
                "AI edit targets protected app metadata or an unsupported operation",
            ));
        }
        let encoded = edit["valueJson"]
            .as_str()
            .ok_or(bad("AI edit needs JSON-encoded value"))?;
        let value: Value =
            serde_json::from_str(encoded).map_err(|_| bad("AI edit contains invalid JSON"))?;
        operations.push(json!({"op":edit["op"],"path":path,"value":value}));
    }
    let patch: json_patch::Patch =
        serde_json::from_value(json!(operations)).map_err(|_| bad("Invalid AI JSON patch"))?;
    let mut manifest = old.clone();
    json_patch::patch(&mut manifest, &patch)
        .map_err(|_| bad("AI edit does not match the current app; refine the instruction"))?;
    generation_contract::retain(old, &mut manifest)?;
    let mut baseline = old.clone();
    generation_contract::retain(old, &mut baseline)?;
    if manifest == baseline {
        return Err(bad(
            "AI proposed no effective app changes; refine the instruction",
        ));
    }
    if manifest.to_string().len() > 65536 {
        return Err(bad("Edited app exceeds 64 KiB"));
    }
    let mut version = semver::Version::parse(old["version"].as_str().unwrap_or(""))
        .map_err(|_| bad("Current app requires a semantic version"))?;
    version.pre = semver::Prerelease::EMPTY;
    version.build = semver::BuildMetadata::EMPTY;
    loop {
        version.patch = version
            .patch
            .checked_add(1)
            .ok_or(bad("App version overflow"))?;
        if !versions
            .as_array()
            .into_iter()
            .flatten()
            .any(|v| v["app"] == old["id"] && v["version"] == version.to_string())
        {
            break;
        }
    }
    manifest["version"] = json!(version.to_string());
    Ok(json!({"manifest":manifest,"summary":output["summary"]}))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn original() -> Value {
        json!({"id":"test_app","version":"1.0.0","entities":[{"name":"notes","publicRead":false,"fields":[{"name":"text","kind":"string"}]}],"views":[{"id":"main","blocks":[]}],"events":["order.placed"]})
    }
    fn edit(path: &str, value: Value) -> Value {
        json!({"summary":{"en":"Edit"},"patch":[{"op":"add","path":path,"valueJson":value.to_string()}]})
    }
    #[test]
    fn appends_native_control_without_rewriting_storage_and_skips_used_version() {
        let old = original();
        let out = apply(
            &old,
            &edit(
                "/views/0/blocks/-",
                json!({"id":"notes","kind":"textbox","entity":"notes","dataField":"text"}),
            ),
            &json!([{"app":"test_app","version":"1.0.1"}]),
        )
        .unwrap();
        assert_eq!(out["manifest"]["version"], "1.0.2");
        assert_eq!(out["manifest"]["entities"], old["entities"]);
        assert_eq!(out["manifest"]["events"], old["events"]);
        assert_eq!(out["manifest"]["views"][0]["blocks"][0]["kind"], "textbox");
        assert_eq!(old, original());
    }
    #[test]
    fn rejects_metadata_changes_destructive_schemas_invalid_paths_and_noops() {
        for output in [
            edit("/id", json!("foreign")),
            edit("/version", json!("9.0.0")),
            edit("/entities", json!([])),
            edit("/entities/0/fields/0/kind", json!("integer")),
            edit("/views/99/blocks/-", json!({})),
            edit("/views", original()["views"].clone()),
            json!({"patch":[]}),
        ] {
            assert!(apply(&original(), &output, &json!([])).is_err());
        }
    }
}
