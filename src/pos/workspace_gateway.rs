//! Cashier workspace commands delegate to CRM, native discounts and immutable receipt projection.
use super::input::Input;
use super::*;
pub(super) async fn invoke(
    a: &App,
    h: RequestContext,
    channel: &str,
    op: &str,
    v: &Value,
    input: &Input,
) -> Result<Value> {
    match op {
        "customers" => {
            super::customer::find(
                a,
                &h,
                input.query.as_deref().unwrap_or(""),
                input.barcode.as_deref(),
            )
            .await
        }
        "customer" => {
            if !v.get("customerId").is_some_and(|id| {
                id.is_null()
                    || id
                        .as_str()
                        .is_some_and(|id| !id.is_empty() && id.len() <= 100)
            }) {
                return Err(bad("Customer ID required; null removes it"));
            }
            load_cart(a, &h).await?;
            super::customer::select(
                a,
                &h,
                input.customer_id.as_deref(),
                input.revision.ok_or(bad("Cart revision required"))?,
            )
            .await
        }
        "discount" => {
            load_cart(a, &h).await?;
            super::discount::save(
                a,
                &h,
                v.get("discount")
                    .ok_or(bad("Discount required; null removes it"))?,
                input.revision.ok_or(bad("Cart revision required"))?,
            )
            .await
        }
        "receipt" => {
            let snapshot = operations::receipt_snapshot(
                a,
                &h,
                input.order_id.as_deref().ok_or(bad("Order required"))?,
                input.receipt_id.as_deref().ok_or(bad("Receipt required"))?,
            )
            .await?;
            if snapshot["order"]["salesChannelId"] != channel
                || !snapshot["order"]["pos"].is_object()
            {
                return Err(Error(
                    StatusCode::NOT_FOUND,
                    "POS receipt unavailable".into(),
                ));
            }
            Ok(json!({"number":snapshot["number"],"lines":operations::receipt_lines(&snapshot)}))
        }
        _ => Err(bad("Unknown cashier operation")),
    }
}
