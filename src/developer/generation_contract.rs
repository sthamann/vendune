//! Generated revisions preserve existing storage and access boundaries; destructive changes require manual schema review.
use super::*;
/// Models may add fields and change presentation but never drop persisted schemas or broaden old exposure.
pub(super) fn retain(old: &Value, next: &mut Value) -> Result<()> {
    if old.is_null() {
        return Ok(());
    }
    if old["id"] != next["id"] {
        return Err(bad("AI must preserve the current app ID"));
    }
    retain_lifecycles(old, next)?;
    for entity in old["entities"].as_array().into_iter().flatten() {
        let candidate = next["entities"]
            .as_array_mut()
            .and_then(|es| es.iter_mut().find(|e| e["name"] == entity["name"]))
            .ok_or(bad(
                "AI cannot remove existing data models; use explicit schema migration",
            ))?;
        candidate["publicRead"] = entity.get("publicRead").cloned().unwrap_or(json!(false));
        if let Some(binding) = entity.get("extends") {
            candidate["extends"] = binding.clone();
        } else if let Some(object) = candidate.as_object_mut() {
            object.remove("extends");
        }
        // Generated presentation edits must not silently remove an existing business lifecycle.
        if let Some(workflow) = entity.get("workflow") {
            candidate["workflow"] = workflow.clone();
        }
        for field in entity["fields"].as_array().into_iter().flatten() {
            let target = candidate["fields"]
                .as_array_mut()
                .and_then(|fs| fs.iter_mut().find(|f| f["name"] == field["name"]))
                .ok_or(bad(
                    "AI cannot remove existing fields; use explicit schema migration",
                ))?;
            if target["kind"] != field["kind"] {
                return Err(bad(
                    "AI cannot change existing field types; use explicit schema migration",
                ));
            }
            for key in [
                "coreReference",
                "references",
                "indexed",
                "unique",
                "required",
                "translatable",
                "validation",
            ] {
                if let Some(value) = field.get(key) {
                    target[key] = value.clone();
                } else if let Some(object) = target.as_object_mut() {
                    object.remove(key);
                }
            }
        }
    }
    if let Some(settings) = old.get("settings") {
        next["settings"] = settings.clone();
    }
    if old["runtime"] == "service" {
        for key in ["runtime", "category", "paymentProvider"] {
            if let Some(value) = old.get(key) {
                next[key] = value.clone();
            }
        }
    }
    // Manual service and event actions are outside the generation schema; retaining them prevents broken integrations.
    if let Some(actions) = next.get_mut("actions").and_then(Value::as_array_mut) {
        for prior in old["actions"].as_array().into_iter().flatten() {
            if !actions.iter().any(|action| action["name"] == prior["name"]) {
                actions.push(prior.clone());
            }
        }
    }
    for surface in next["surfaces"].as_array_mut().into_iter().flatten() {
        if let Some(prior) = old["surfaces"]
            .as_array()
            .and_then(|ss| ss.iter().find(|s| s["id"] == surface["id"]))
        {
            for key in ["permission", "location"] {
                if let Some(value) = prior.get(key) {
                    surface[key] = value.clone();
                } else if let Some(object) = surface.as_object_mut() {
                    object.remove(key);
                }
            }
        }
    }
    // The generation schema intentionally does not own these advanced/manual integrations.
    for key in [
        "commerceHooks",
        "capability",
        "distribution",
        "configuration",
        "events",
        "eventFilters",
        "eventDelivery",
        "schedules",
        "webhooks",
    ] {
        if let Some(value) = old.get(key) {
            next[key] = value.clone();
        }
    }
    for view in next["views"].as_array_mut().into_iter().flatten() {
        if let Some(prior) = old["views"]
            .as_array()
            .and_then(|vs| vs.iter().find(|v| v["id"] == view["id"]))
        {
            retain_handlers(&prior["blocks"], &mut view["blocks"]);
        }
    }
    Ok(())
}
/// A normal AI edit may add a missing native domain, but cannot rewrite an accepted contract.
fn retain_lifecycles(old: &Value, next: &mut Value) -> Result<()> {
    if old.get("lifecycles").is_none() && next.get("lifecycles").is_none() {
        return Ok(());
    }
    let mut contracts = next.get("lifecycles").cloned().unwrap_or(json!([]));
    let candidates = contracts
        .as_array_mut()
        .ok_or(bad("AI native workflows must be an array"))?;
    for prior in old["lifecycles"].as_array().into_iter().flatten() {
        if let Some(candidate) = candidates.iter().find(|c| c["object"] == prior["object"]) {
            if candidate != prior {
                return Err(bad(
                    "AI cannot change an existing native workflow; use its versioned workflow editor",
                ));
            }
        } else {
            candidates.push(prior.clone());
        }
    }
    if candidates.is_empty() && old.get("lifecycles").is_none() {
        next.as_object_mut()
            .ok_or(bad("AI requires an app object"))?
            .remove("lifecycles");
    } else {
        if !candidates.is_empty() {
            let permissions = next["permissions"]
                .as_array_mut()
                .ok_or(bad("AI native workflow requires an app permission list"))?;
            if !permissions.iter().any(|p| p == "commerce.lifecycle") {
                permissions.push(json!("commerce.lifecycle"));
            }
        }
        next["lifecycles"] = contracts;
    }
    Ok(())
}
/// Nested frames and tabs use the same handler contract as top-level controls.
fn retain_handlers(old: &Value, next: &mut Value) {
    for block in next.as_array_mut().into_iter().flatten() {
        if let Some(before) = old
            .as_array()
            .and_then(|blocks| blocks.iter().find(|b| b["id"] == block["id"]))
        {
            if let Some(handlers) = before.get("handlers") {
                block["handlers"] = handlers.clone();
            }
            if let Some(children) = block.get_mut("childBlocks") {
                retain_handlers(&before["childBlocks"], children);
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_workflow_additions_retain_prior_domains_and_explicit_consent() {
        let order =
            json!({"object":"order","states":[],"transitions":[{"guards":["delivery.delivered"]}]});
        let quote = json!({"object":"quote","states":[],"transitions":[]});
        let mut original = old();
        original["permissions"] = json!(["commerce.lifecycle"]);
        original["lifecycles"] = json!([order]);
        let mut generated = original.clone();
        generated["lifecycles"] = json!([quote]);
        retain(&original, &mut generated).unwrap();
        assert_eq!(generated["lifecycles"], json!([quote, order]));
        assert_eq!(generated["permissions"], original["permissions"]);
        generated["lifecycles"][1]["transitions"][0]["guards"] = json!([]);
        assert!(retain(&original, &mut generated).is_err());
        generated = original.clone();
        generated.as_object_mut().unwrap().remove("lifecycles");
        retain(&original, &mut generated).unwrap();
        assert_eq!(generated, original);
    }
    #[test]
    fn first_native_workflow_adds_consent_and_empty_declarations_are_noops() {
        let mut original = old();
        original["permissions"] = json!([]);
        let mut generated = original.clone();
        generated["lifecycles"] = json!([]);
        retain(&original, &mut generated).unwrap();
        assert_eq!(generated, original);
        generated["lifecycles"] = json!([{"object":"order"}]);
        retain(&original, &mut generated).unwrap();
        assert_eq!(generated["permissions"], json!(["commerce.lifecycle"]));
    }
    fn old() -> Value {
        json!({"id":"same","entities":[{"name":"cases","publicRead":false,"fields":[{"name":"order_id","kind":"string","coreReference":"order","indexed":true}]}],"surfaces":[{"id":"editor","location":"admin.order","permission":"orders.write"}],"events":["order.placed"],"views":[{"id":"main","blocks":[{"id":"save","handlers":{"click":[{"op":"refresh","target":"table"}]}}]}]})
    }
    #[test]
    fn keeps_private_core_references_and_handlers() {
        let original = old();
        let mut generated = original.clone();
        generated["entities"][0]["publicRead"] = json!(true);
        generated["entities"][0]["fields"][0]["coreReference"] = json!("customer");
        generated["surfaces"][0]["permission"] = json!(null);
        generated["views"][0]["blocks"][0]["handlers"] = json!(null);
        generated["events"] = json!([]);
        retain(&original, &mut generated).unwrap();
        assert_eq!(original, generated);
    }
    #[test]
    fn retains_workflow_edges_and_immutable_identity_from_ai_edits() {
        let mut original = old();
        original["entities"][0]["workflow"] = json!({
            "field":"status", "initial":"new",
            "transitions":[{"from":"new","to":"review"}],
            "immutableFields":["order_id"]
        });
        let mut generated = original.clone();
        generated["entities"][0]["workflow"] = json!(null);
        retain(&original, &mut generated).unwrap();
        assert_eq!(original, generated);
    }
    #[test]
    fn keeps_external_service_and_manual_actions() {
        let original = json!({"id":"erp","runtime":"service","category":"integration","entities":[],"surfaces":[],"views":[],"events":["order.placed"],"actions":[{"name":"synchronize","handler":"service","permission":"orders.read","mcp":false}]});
        let mut generated = json!({"id":"erp","runtime":"declarative","category":null,"entities":[],"surfaces":[],"views":[],"actions":[]});
        retain(&original, &mut generated).unwrap();
        assert_eq!(generated, original);
    }
    #[test]
    fn model_edits_cannot_rewrite_existing_acceptance_examples() {
        let mut original = old();
        original["capability"] = json!({"version":1,"intent":{"en":"Apply one percent"},"assumptions":[],"examples":[{"id":"unchanged","expected":{"minor":100}}]});
        let mut generated = original.clone();
        generated["capability"]["examples"] = json!([]);
        retain(&original, &mut generated).unwrap();
        assert_eq!(generated, original);
    }
    #[test]
    fn keeps_nested_control_handlers() {
        let mut original = old();
        original["views"][0]["blocks"][0]["childBlocks"] = json!([{
            "id":"save_child","handlers":{"click":[{"op":"refresh","target":"cases"}]}
        }]);
        let mut generated = original.clone();
        generated["views"][0]["blocks"][0]["childBlocks"][0]["handlers"] = json!(null);
        retain(&original, &mut generated).unwrap();
        assert_eq!(original, generated);
    }
    #[test]
    fn refuses_identity_schema_removal_and_type_changes() {
        for change in 0..4 {
            let mut v = old();
            match change {
                0 => v["id"] = json!("foreign"),
                1 => v["entities"] = json!([]),
                2 => v["entities"][0]["fields"] = json!([]),
                _ => v["entities"][0]["fields"][0]["kind"] = json!("integer"),
            };
            assert!(retain(&old(), &mut v).is_err());
        }
    }
}
