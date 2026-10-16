//! One immutable native operation record for dispatch, schemas, MCP discovery and bounded agent reads.
use super::*;
use dispatch::Owner;
use std::sync::LazyLock;
#[derive(Clone, Copy, PartialEq)]
enum Effect {
    Read,
    Write,
}
pub(crate) struct Operation {
    pub(crate) name: &'static str,
    description: &'static str,
    pub(super) owner: Owner,
    input: Value,
    effect: Effect,
    agent_read: bool,
}
pub(crate) static OPERATIONS: LazyLock<Vec<Operation>> = LazyLock::new(|| {
    let definitions = catalog::definitions();
    let mut seen = std::collections::HashSet::new();
    definitions
        .into_iter()
        .map(|(name, description)| {
            assert!(seen.insert(name), "Duplicate native operation {name}");
            let agent_read = matches!(
                name,
                "knowledge.behavior"
                    | "catalog.search"
                    | "catalog.detail"
                    | "merchant.catalog.context"
                    | "merchant.products"
                    | "merchant.product.content"
                    | "merchant.orders"
                    | "merchant.order"
                    | "merchant.commerce.read"
                    | "merchant.company"
                    | "automation.list"
                    | "automation.catalog"
                    | "knowledge.claims"
                    | "knowledge.experiments"
                    | "knowledge.experiment.report"
                    | "knowledge.search"
                    | "knowledge.external"
                    | "knowledge.workspace"
                    | "knowledge.product"
                    | "knowledge.source.detail"
            );
            // Unclassified operations deliberately retain conservative mutating hints.
            let read = agent_read
                || name == "merchant.run.status"
                || matches!(name, "catalog.facts" | "checkout.options" | "cart.quote");
            Operation {
                name,
                description,
                owner: Owner::for_name(name),
                input: schema::input(name),
                effect: if read { Effect::Read } else { Effect::Write },
                agent_read,
            }
        })
        .collect()
});
pub(super) fn find(name: &str) -> Option<&'static Operation> {
    OPERATIONS.iter().find(|operation| operation.name == name)
}
pub(crate) fn tool_schema(name: &str) -> Value {
    find(name)
        .map(|operation| operation.input.clone())
        .unwrap_or_else(|| json!({}))
}
pub(crate) fn agent_reads(a: &App, h: &RequestContext) -> Vec<Value> {
    OPERATIONS
        .iter()
        .filter(|operation| {
            operation.agent_read && operation.effect == Effect::Read && operation.admitted(a, h)
        })
        .map(|operation| operation.tool())
        .collect()
}
impl Operation {
    pub(crate) fn input_schema(&self) -> Value {
        self.input.clone()
    }
    pub(crate) fn admitted(&self, a: &App, h: &RequestContext) -> bool {
        admission::visible(a, h, self.name)
    }
    pub(crate) fn description(&self) -> Value {
        json!({"name":self.name,"description":self.description})
    }
    pub(crate) fn tool(&self) -> Value {
        super::ToolContract::describe(
            self.name,
            self.description,
            &self.input,
            None,
            self.effect == Effect::Read,
        )
    }
}
/// Build-time contract export is offline and includes no actor credentials or records.
pub(crate) fn export() -> Value {
    json!({"version":1,"operations":OPERATIONS.iter().map(|o|json!({"name":o.name,"description":o.description,"inputSchema":o.input,"readOnly":o.effect==Effect::Read})).collect::<Vec<_>>()})
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn catalog_contract_preserves_native_categories_and_search_alias() {
        let schema = tool_schema("catalog.search");
        for value in [
            json!({"categoryId":"cycle","search":"lamp"}),
            json!({"query":"lamp"}),
        ] {
            apps::validate_native_input(&schema, &value).unwrap();
            let parsed: CatalogCriteria = serde_json::from_value(value).unwrap();
            assert_eq!(parsed.search.as_deref(), Some("lamp"));
            parsed.page_size().unwrap();
        }
        assert!(apps::validate_native_input(&schema, &json!({"categoryId":true})).is_err());
    }
    #[test]
    fn every_operation_has_one_contract_and_agent_reads_are_conservative() {
        assert!(OPERATIONS.len() > 100);
        for operation in OPERATIONS.iter() {
            assert_eq!(operation.input["type"], "object", "{}", operation.name);
            assert_eq!(find(operation.name).unwrap().name, operation.name);
            if operation.agent_read {
                assert!(operation.effect == Effect::Read);
            }
        }
        for name in [
            "merchant.apply",
            "checkout.complete",
            "merchant.product.save",
            "automation.save",
        ] {
            let operation = find(name).unwrap();
            assert!(!operation.agent_read);
            assert_eq!(operation.tool()["annotations"]["readOnlyHint"], false);
        }
    }
}
