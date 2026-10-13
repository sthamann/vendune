//! Generated conformance driver; invokes the same production policy functions as the commerce server.
use sellm::verified_kernel::*;
use serde_json::{Value, json};
pub(super) fn eval(j: &Value) -> Result<Value, String> {
    let args = &j["args"];
    let n = |key: &str| args[key].as_u64().ok_or_else(|| format!("Invalid {key}"));
    let b = |key: &str| args[key].as_bool().ok_or_else(|| format!("Invalid {key}"));
    match j["function"].as_str() {
        Some("discount_cap") => Ok(json!(discount_cap(n("total")?, n("requested")?))),
        Some("stock_admissible") => Ok(json!(stock_admissible(n("stock")?, n("quantity")?))),
        Some("refund_admissible") => Ok(json!(refund_admissible(
            n("captured")?,
            n("refunded")?,
            n("requested")?
        ))),
        Some("revision_admissible") => {
            Ok(json!(revision_admissible(n("current")?, n("expected")?)))
        }
        Some("replay_admissible") => Ok(json!(replay_admissible(
            b("same_cart")?,
            b("cart_open")?,
            b("same_fingerprint")?
        ))),
        Some("scope_admissible") => Ok(json!(scope_admissible(
            b("authenticated")?,
            b("known_scope")?,
            b("owner")?,
            b("explicit")?,
            b("explicit_grant")?,
            b("default_grant")?
        ))),
        Some("order_edit_admissible") => Ok(json!(order_edit_admissible(b("terminal")?))),
        Some("completion_admissible") => Ok(json!(completion_admissible(
            b("terminal")?,
            b("payment_ready")?,
            b("deliveries_ready")?
        ))),
        Some("cancellation_admissible") => Ok(json!(cancellation_admissible(
            b("terminal")?,
            b("external_payment")?,
            b("refund_required")?,
            b("deliveries_open")?
        ))),
        Some("manual_payment_admissible") => Ok(json!(manual_payment_admissible(
            b("terminal")?,
            b("external_payment")?,
            b("current_pending")?,
            b("target_paid")?
        ))),
        Some("download_admissible") => Ok(json!(download_admissible(
            b("order_blocked")?,
            b("paid")?,
            b("simulated_authorized")?
        ))),
        Some("checkout_contact_admissible") => Ok(json!(checkout_contact_admissible(
            b("simulated")?,
            b("email_present")?,
            b("billing_present")?
        ))),
        Some("receipt_admissible") => Ok(json!(receipt_admissible(
            n("expected")?,
            n("received")?,
            b("same_currency")?,
            b("confirmed")?
        ))),
        Some("rule_authenticated") => Ok(json!(rule_authenticated(
            b("customer_present")?,
            b("required")?
        ))),
        Some("rule_boolean_comparison") => Ok(json!(rule_boolean_comparison(
            b("equal")?,
            b("empty")?,
            b("eq")?,
            b("neq")?,
            b("is_empty")?
        ))),
        Some("app_flow_admissible") => Ok(json!(app_flow_admissible(
            b("allowed")?,
            b("read_only")?,
            b("is_public")?
        ))),
        Some("platform_admissible") => Ok(json!(platform_admissible(
            b("personal")?,
            b("granted")?,
            b("active")?
        ))),
        Some("app_read_admissible") => {
            Ok(json!(app_read_admissible(b("read_only")?, b("mutating")?)))
        }
        Some("rule_xor_count") => Ok(json!(rule_xor_count(n("hits")?))),
        Some("flow_delay_admissible") => Ok(json!(flow_delay_admissible(n("seconds")?))),
        Some("destination_tax_admissible") => Ok(json!(destination_tax_admissible(
            b("condition")?,
            b("country")?,
            b("state")?,
            b("postal")?,
            b("date")?
        ))),
        Some("customer_group_net") => {
            Ok(json!(customer_group_net(b("configured")?, b("business")?)))
        }
        Some("app_tool_admissible") => {
            Ok(json!(app_tool_admissible(b("enabled")?, b("authorized")?)))
        }
        Some("app_core_reference_admissible") => Ok(json!(app_core_reference_admissible(
            b("product")?,
            b("private_data")?
        ))),
        Some("checkout_review_admissible") => Ok(json!(checkout_review_admissible(
            b("revision_matches")?,
            n("expected_total")?,
            n("actual_total")?,
            b("methods_confirmed")?
        ))),
        Some("shop_request_admissible") => Ok(json!(shop_request_admissible(
            b("active")?,
            b("paused")?,
            b("read_only")?,
            b("settlement")?
        ))),
        Some("reservation_release_admissible") => Ok(json!(reservation_release_admissible(
            b("uncaptured")?,
            b("authorized")?,
            b("void_confirmed")?
        ))),
        Some("currency_context_admissible") => Ok(json!(currency_context_admissible(
            b("enabled")?,
            b("configured")?,
            b("fresh")?
        ))),
        Some("currency_scale_admissible") => Ok(json!(currency_scale_admissible(n("scale")?))),
        Some("payment_transition_admissible") => Ok(json!(payment_transition_admissible(
            n("current")?,
            n("next")?
        ))),
        Some("resource_quota_admissible") => Ok(json!(resource_quota_admissible(n("limit")?))),
        Some("consent_admissible") => Ok(json!(consent_admissible(
            b("enabled")?,
            b("current")?,
            b("fresh")?,
            b("chosen")?
        ))),
        Some("legal_checkout_admissible") => Ok(json!(legal_checkout_admissible(
            b("strict")?,
            b("current")?,
            b("accepted")?,
            b("digital")?,
            b("immediate")?
        ))),
        Some("notification_retry_admissible") => Ok(json!(notification_retry_admissible(
            b("rate_limited")?,
            n("attempts")?
        ))),
        Some("app_service_transport_admissible") => Ok(json!(app_service_transport_admissible(
            b("clean_url")?,
            b("https")?,
            b("http")?,
            b("loopback")?,
            b("private_origin")?
        ))),
        Some("channel_access_admissible") => Ok(json!(channel_access_admissible(
            b("active")?,
            b("is_private")?,
            b("merchant")?,
            b("preview")?,
            b("mutating")?
        ))),
        Some("native_asset_bypass") => {
            Ok(json!(native_asset_bypass(b("native_asset")?, b("hosted")?)))
        }
        Some("app_package_authorized") => {
            Ok(json!(app_package_authorized(b("pinned")?, b("bundled")?)))
        }
        Some("wasm_resources_admissible") => Ok(json!(wasm_resources_admissible(
            n("tables")?,
            n("memories")?,
            n("elements")?,
            n("pages")?
        ))),
        Some("app_surface_admissible") => Ok(json!(app_surface_admissible(
            b("current_package")?,
            b("allowed_action")?
        ))),
        Some("app_callback_admissible") => Ok(json!(app_callback_admissible(
            b("capability")?,
            b("current_role")?
        ))),
        Some("ai_price_admissible") => Ok(json!(ai_price_admissible(
            n("price")?,
            n("minimum")?,
            n("maximum")?,
            b("margin")?,
            b("discount")?,
            b("brand")?,
            b("available")?
        ))),
        Some("ai_autonomy_admissible") => Ok(json!(ai_autonomy_admissible(
            b("enabled")?,
            b("authorized")?,
            b("price_only")?,
            b("daily_budget")?,
            b("within_delta")?
        ))),
        Some("claim_render_admissible") => Ok(json!(claim_render_admissible(
            b("confirmed")?,
            b("public_source")?,
            b("current_source")?,
            b("valid_time")?,
            b("exact_text")?
        ))),
        Some("experiment_result_admissible") => Ok(json!(experiment_result_admissible(
            b("final_look")?,
            b("enough_units")?,
            b("positive_bound")?
        ))),
        Some("pos_cash_admissible") => Ok(json!(pos_cash_admissible(
            b("authorized")?,
            n("tender")?,
            n("total")?,
            b("reviewed")?
        ))),
        Some("b2b_budget_admissible") => Ok(json!(b2b_budget_admissible(
            n("limit")?,
            n("spent")?,
            n("requested")?
        ))),
        Some("b2b_approval_admissible") => Ok(json!(b2b_approval_admissible(
            b("different")?,
            b("authorized")?,
            b("pending")?,
            b("current")?
        ))),
        Some("pos_discount_admissible") => Ok(json!(pos_discount_admissible(
            b("actor")?,
            b("currency")?,
            b("reason")?,
            n("minor")?,
            n("goods")?
        ))),
        Some("external_amount_admissible") => Ok(json!(external_amount_admissible(
            n("gross")?,
            n("tax")?,
            n("rate")?
        ))),
        Some("external_paid_total_admissible") => Ok(json!(external_paid_total_admissible(
            b("paid")?,
            n("calculated")?,
            n("declared")?
        ))),
        _ => Err("Unknown policy".into()),
    }
}
