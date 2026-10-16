//! Bounded native order/customer filter and sort contracts, reused by HTTP, MCP and reviewed grid plans.
use crate::*;
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Criteria {
    #[serde(default)]
    pub app_filter: String,
    #[serde(default)]
    pub query: String,
    #[serde(default)]
    pub after: String,
    pub limit: Option<i64>,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub sort: String,
    #[serde(default)]
    pub direction: String,
    #[serde(default)]
    pub customer: String,
    #[serde(default)]
    pub payment_state: String,
    #[serde(default)]
    pub delivery_state: String,
    #[serde(default)]
    pub channel_id: String,
    pub from: Option<String>,
    pub to: Option<String>,
    pub guest: Option<bool>,
    pub active: Option<bool>,
    #[serde(default)]
    pub group: String,
}
pub(crate) fn direction(value: &str, default: &'static str) -> Result<&'static str> {
    match value {
        "" => Ok(default),
        "asc" => Ok("ASC"),
        "desc" => Ok("DESC"),
        _ => Err(bad("Invalid sort direction")),
    }
}
impl Criteria {
    pub(crate) fn validate(&self) -> Result<i64> {
        if [
            (&self.query, 200),
            (&self.after, 254),
            (&self.state, 40),
            (&self.customer, 200),
            (&self.payment_state, 40),
            (&self.delivery_state, 40),
            (&self.channel_id, 100),
            (&self.group, 100),
        ]
        .iter()
        .any(|(v, max)| v.len() > *max || v.chars().any(char::is_control))
        {
            return Err(bad("Invalid search criteria"));
        }
        for date in [&self.from, &self.to].into_iter().flatten() {
            let parsed = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
                .map_err(|_| bad("Invalid filter date"))?;
            if parsed.format("%Y-%m-%d").to_string() != *date {
                return Err(bad("Invalid filter date"));
            }
        }
        if self
            .from
            .as_ref()
            .zip(self.to.as_ref())
            .is_some_and(|(from, to)| from > to)
        {
            return Err(bad("Invalid date range"));
        }
        apps::extension_filter::decode(&self.app_filter)?;
        let n = self.limit.unwrap_or(30);
        if !(1..=100).contains(&n) {
            return Err(bad("limit must be 1..100"));
        }
        Ok(n)
    }
    pub(crate) fn sort_for(&self, entity: &str) -> Result<(&'static str, &'static str)> {
        if (entity == "orders"
            && (self.guest.is_some() || self.active.is_some() || !self.group.is_empty()))
            || (entity == "customers"
                && (!self.state.is_empty()
                    || !self.customer.is_empty()
                    || !self.payment_state.is_empty()
                    || !self.delivery_state.is_empty()
                    || !self.channel_id.is_empty()
                    || self.from.is_some()
                    || self.to.is_some()))
        {
            return Err(bad("Unsupported domain filter"));
        }
        let field = match (entity, self.sort.as_str()) {
            ("orders", "" | "created") => "o.created_at",
            ("orders", "number") => "coalesce(o.data->>'orderNumber','')",
            ("orders", "customer") => {
                "lower(coalesce(o.data->'orderCustomer'->>'name',o.data->'orderCustomer'->>'email',''))"
            }
            ("orders", "total") => "(o.data->'cart'->'price'->>'totalPrice')::numeric",
            ("orders", "state") => "coalesce(o.data->>'state','')",
            ("customers", "" | "email") => "email",
            ("customers", "name") => "lower(coalesce(contact->'profile'->>'name',email))",
            ("customers", "created") => "coalesce(contact->>'createdAt','')",
            ("customers", "number") => "coalesce(contact->>'customerNumber','')",
            _ => return Err(bad("Unsupported list sort")),
        };
        Ok((
            field,
            direction(
                &self.direction,
                if entity == "orders" { "DESC" } else { "ASC" },
            )?,
        ))
    }
}
