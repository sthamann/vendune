//! Bounded personal layouts contain references, never delegated rights or executable agent instructions.
use crate::*;
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Workspace {
    areas: Vec<Area>,
    active: String,
    goals: Vec<Goal>,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Area {
    id: String,
    name: String,
    cards: Vec<String>,
    pins: Vec<Pin>,
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Pin {
    title: String,
    tab: String,
    query: String,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Goal {
    id: String,
    title: String,
    status: String,
    task_id: Option<String>,
}
pub(super) fn empty() -> Value {
    json!({"areas":[],"active":"","goals":[]})
}
pub(super) fn validate(v: &Value) -> Result<Value> {
    let w: Workspace =
        serde_json::from_value(v.clone()).map_err(|_| bad("Invalid personal workspace"))?;
    let text = |s: &str, n| !s.trim().is_empty() && s.len() <= n;
    let mut ids = std::collections::HashSet::new();
    if v.to_string().len() > 24000 || w.areas.len() > 8 || w.goals.len() > 30 || w.active.len() > 32
    {
        return Err(bad("Workspace exceeds personal storage limits"));
    }
    for a in &w.areas {
        if !apps::identifier(&a.id)
            || !ids.insert(&a.id)
            || !text(&a.name, 100)
            || a.cards.len() > 16
            || a.pins.len() > 20
            || a.cards.iter().any(|s| !apps::identifier(&s.to_lowercase()))
            || a.cards
                .iter()
                .collect::<std::collections::HashSet<_>>()
                .len()
                != a.cards.len()
            || a.pins.iter().any(|p| {
                !text(&p.title, 100)
                    || !apps::identifier(&p.tab.to_lowercase())
                    || !safe_pin(&p.query)
            })
        {
            return Err(bad("Invalid workspace area, card or pinned view"));
        }
    }
    if !w.active.is_empty() && !w.areas.iter().any(|a| a.id == w.active) {
        return Err(bad("Active area does not exist"));
    }
    let mut goals = std::collections::HashSet::new();
    if w.goals.iter().any(|g| {
        !apps::identifier(&g.id)
            || !goals.insert(&g.id)
            || !text(&g.title, 1000)
            || !["planned", "working", "review", "done", "stopped"].contains(&g.status.as_str())
            || g.task_id.as_ref().is_some_and(|s| !text(s, 100))
    }) {
        return Err(bad("Invalid personal goal"));
    }
    Ok(json!(w))
}
fn safe_pin(query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    if query.len() > 1000 {
        return false;
    }
    serde_json::from_str::<Value>(query)
        .ok()
        .and_then(|v| v.as_object().cloned())
        .is_some_and(|v| {
            v.iter().all(|(k, v)| {
                [
                    "sort",
                    "direction",
                    "state",
                    "paymentState",
                    "deliveryState",
                    "channelId",
                    "from",
                    "to",
                    "group",
                    "categoryId",
                    "active",
                    "guest",
                    "lowStock",
                ]
                .contains(&k.as_str())
                    && (v.is_boolean()
                        || v.as_str().is_some_and(|s| {
                            !s.is_empty()
                                && s.len() <= 100
                                && s.bytes()
                                    .all(|b| b.is_ascii_alphanumeric() || b"_.:-".contains(&b))
                        }))
            })
        })
}
pub(crate) fn schema(n: &str) -> Option<Value> {
    let properties = match n {
        "studio.workspace.read" => json!({}),
        "studio.workspace.save" => {
            json!({"revision":{"type":"integer","minimum":0},"data":{"type":"object"}})
        }
        _ => return None,
    };
    Some(
        json!({"type":"object","additionalProperties":false,"properties":properties,
        "required":if n.ends_with("save"){vec!["revision","data"]}else{vec![]}}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn actor_preferences_are_bounded_and_not_authority() {
        assert!(validate(&empty()).is_ok());
        assert!(!safe_pin(r#"{"query":"buyer@example.test"}"#));
        assert!(!safe_pin(r#"{"customer":"Alice"}"#));
        assert!(safe_pin(r#"{"state":"open","active":true}"#));
        let mut v = empty();
        v["permissions"] = json!(["owner"]);
        assert!(validate(&v).is_err());
        let mut v = empty();
        v["active"] = json!("missing");
        assert!(validate(&v).is_err());
    }
}
