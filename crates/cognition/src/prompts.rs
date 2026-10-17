//! Versioned system-prompt provenance; no prompt text or private context is exposed in evidence.
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
const TEMPLATES: &[(&str, &str)] = &[
    (
        "merchant-planner@1",
        include_str!("../prompts/merchant-planner.v1.txt"),
    ),
    (
        "app-generation@1",
        include_str!("../prompts/app-generation.v1.txt"),
    ),
    (
        "app-coding-task@1",
        include_str!("../prompts/app-coding-task.v1.txt"),
    ),
    ("app-edit@1", include_str!("../prompts/app-edit.v1.txt")),
    ("app-edit@2", include_str!("../prompts/app-edit.v2.txt")),
    ("app-edit@3", include_str!("../prompts/app-edit.v3.txt")),
    (
        "grid-filter@1",
        include_str!("../prompts/grid-filter.v1.txt"),
    ),
];
pub fn evidence(system: &str) -> Value {
    let templates = TEMPLATES
        .iter()
        .filter(|(id, _)| system.starts_with(&format!("[prompt:{id}]\n")))
        .map(|(id, text)| json!({"id":id,"sha256":format!("{:x}",Sha256::digest(text.as_bytes()))}))
        .collect::<Vec<_>>();
    json!({"templates":templates,"systemSha256":format!("{:x}",Sha256::digest(system.as_bytes())),"registered":!templates.is_empty()})
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn workflow_edit_revision_binds_its_own_template_and_rendered_context() {
        for (id, template) in [
            ("app-edit@2", include_str!("../prompts/app-edit.v2.txt")),
            ("app-edit@3", include_str!("../prompts/app-edit.v3.txt")),
        ] {
            let rendered = format!("{template} untrusted shop context");
            let proof = evidence(&rendered);
            assert_eq!(proof["templates"][0]["id"], id);
            assert_eq!(proof["templates"].as_array().unwrap().len(), 1);
            assert_eq!(
                proof["templates"][0]["sha256"],
                format!("{:x}", Sha256::digest(template.as_bytes()))
            );
            assert_ne!(proof["systemSha256"], evidence(template)["systemSha256"]);
            assert!(!proof.to_string().contains("untrusted shop context"));
        }
    }
    #[test]
    fn revision_and_rendered_context_are_both_bound_without_leaking_context() {
        let s = format!("{} private shop context", TEMPLATES[0].1);
        let e = evidence(&s);
        assert_eq!(e["templates"][0]["id"], "merchant-planner@1");
        assert_eq!(e["registered"], true);
        assert_ne!(e["systemSha256"], evidence(TEMPLATES[0].1)["systemSha256"]);
        assert!(!e.to_string().contains("private shop"));
        assert_eq!(
            evidence("Untrusted source: [prompt:merchant-planner@1]")["registered"],
            false
        );
        assert_eq!(
            evidence(&format!("{} [prompt:app-edit@1]", TEMPLATES[0].1))["templates"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
    }
}
