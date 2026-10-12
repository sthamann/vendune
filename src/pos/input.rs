//! Strict input envelope shared by HTTP and MCP cashier commands.
use super::*;
#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Input {
    pub(super) channel_id: Option<String>,
    pub(super) cart_token: Option<String>,
    pub(super) revision: Option<i64>,
    pub(super) items: Option<Vec<Item>>,
    pub(super) checkout: Option<commerce::CheckoutSelection>,
    pub(super) query: Option<String>,
    pub(super) after: Option<String>,
    pub(super) barcode: Option<String>,
    pub(super) request_key: Option<String>,
    pub(super) tender_minor: Option<String>,
    pub(super) total_minor: Option<String>,
    pub(super) product_id: Option<String>,
    pub(super) customer_id: Option<String>,
    #[serde(rename = "discount")]
    pub(super) _discount: Option<Value>,
    pub(super) receipt_id: Option<String>,
    pub(super) order_id: Option<String>,
    pub(super) policy_version: Option<String>,
    pub(super) currency: Option<String>,
    pub(super) codes: Option<Vec<String>>,
    pub(super) terms: Option<bool>,
    pub(super) digital_immediate: Option<bool>,
}
