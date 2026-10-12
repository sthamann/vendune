//! Bounded typed native company, purchasing-unit and employee policies. Money is currency-bound minor units.
use crate::*;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Company {
    pub name: HashMap<String, String>,
    pub active: bool,
    #[serde(default)]
    pub vat_id: String,
    #[serde(default)]
    pub external_id: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Unit {
    pub name: HashMap<String, String>,
    pub active: bool,
    pub currency: String,
    #[serde(default)]
    pub cost_center: String,
    #[serde(default)]
    pub approval_above_minor: Option<u64>,
    #[serde(default)]
    pub budget_minor: Option<u64>,
    #[serde(default = "monthly")]
    pub budget_period: String,
    #[serde(default)]
    pub restricted_catalog: bool,
    #[serde(default)]
    pub require_purchase_order: bool,
    #[serde(default)]
    pub allowed_shipping: Vec<String>,
    #[serde(default)]
    pub allowed_payments: Vec<String>,
}
fn monthly() -> String {
    "month".into()
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Member {
    pub active: bool,
    pub permissions: Vec<String>,
    #[serde(default)]
    pub approval_above_minor: Option<u64>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Context {
    pub unit_id: String,
    pub customer_id: String,
    #[serde(default)]
    pub purchase_order: String,
    #[serde(default)]
    pub quote_id: Option<String>,
}
pub(crate) struct Access {
    pub company_id: String,
    pub company: Company,
    pub unit: Unit,
    pub member: Member,
    pub version: String,
}
impl Unit {
    pub fn validate(&self) -> Result<()> {
        if currencies::scale(&self.currency).is_none()
            || !["week", "month", "quarter", "year"].contains(&self.budget_period.as_str())
            || self.cost_center.len() > 100
            || self.allowed_shipping.len() > 40
            || self.allowed_payments.len() > 40
            || [self.budget_minor, self.approval_above_minor]
                .into_iter()
                .flatten()
                .any(|n| n > 1_000_000_000_000)
        {
            return Err(bad(
                "Invalid unit currency, budget, period or method restrictions",
            ));
        }
        Ok(())
    }
}
impl Member {
    pub fn validate(&self) -> Result<()> {
        let mut seen = std::collections::HashSet::new();
        if self.permissions.len() > 5
            || self.permissions.iter().any(|p| {
                !["buy", "approve", "lists", "quotes", "companyOrders"].contains(&p.as_str())
                    || !seen.insert(p)
            })
            || self
                .approval_above_minor
                .is_some_and(|n| n > 1_000_000_000_000)
        {
            return Err(bad(
                "Invalid company employee permissions or purchase threshold",
            ));
        }
        Ok(())
    }
    pub fn allows(&self, permission: &str) -> bool {
        self.active && self.permissions.iter().any(|p| p == permission)
    }
}
