//! Merchant CRM and fulfillment APIs, shared verbatim with MCP operations capabilities.
use crate::*;
mod addresses;
mod company_logo;
mod company_model;
mod company_public;
mod creation_schema;
pub(crate) use creation_schema::CAPABILITIES as CREATION_CAPABILITIES;
mod customer_create;
pub(crate) use creation_schema::schema as creation_schema;
mod customer_lookup;
mod customers;
mod manual_order_admission;
mod manual_orders;
pub(crate) use manual_order_admission::{
    admin_order, admin_purchase, admit_admin_payment, admit_admin_products, check_admin_customer,
    guard_admin_cart, lock_admin_checkout,
};
mod guest_customers;
pub(crate) use customers::restore_customer;
pub(crate) use master_data::save as restore_company;
mod master_data;
pub(crate) use master_data::{lock as lock_company, validate_release as validate_company_release};
mod order_list;
mod orders;
mod redacted_reads;
pub(crate) use redacted_reads::redacted_read;
mod receipt_pdf;
mod receipt_text;
pub(crate) use receipt_text::lines as receipt_lines;
mod delivery_booking;
mod order_documents;
pub(crate) use delivery_booking::booking_intent;
mod receipts;
pub(crate) use order_documents::{allocation_digest, document_response, import_document};
pub(crate) use receipts::{receipt_response, receipt_snapshot};
mod routes;
mod workflow;
pub(crate) use routes::router;

mod list_criteria;
pub(crate) use list_criteria::{Criteria, direction as list_direction};
mod grid_schema;
pub(crate) use grid_schema::fields as grid_fields;
mod grid_plan;
pub(crate) use grid_plan::visible as grid_visible;
pub(crate) fn permission(name: &str) -> Option<&'static str> {
    Some(match name {
        "merchant.grid.plan" => "assistant.use",
        "merchant.company" => "settings.read",
        "merchant.company.save" => "settings.write",
        "merchant.workflow" => "orders.read",
        "merchant.workflow.save" => "settings.write",
        "merchant.customer.lookup" | "merchant.customers" | "merchant.customer" => "customers.read",
        "merchant.customer.creation"
        | "merchant.customer.create"
        | "merchant.customer.save"
        | "merchant.customer.address.save"
        | "merchant.customer.address.delete" => "customers.write",
        "merchant.customer.addresses" => "customers.read",
        "merchant.orders" | "merchant.order" => "orders.read",
        "merchant.order.context"
        | "merchant.order.review"
        | "merchant.order.complete"
        | "merchant.order.transition"
        | "merchant.order.note"
        | "merchant.delivery.split" => "orders.write",
        "merchant.receipts" => "documents.read",
        "merchant.receipt.create" => "documents.create",
        "merchant.payment" | "merchant.payment.onboarding" => "payments.manage",
        "merchant.payment.providers" => "payments.read",
        "merchant.products"
        | "merchant.categories"
        | "merchant.product.assets"
        | "merchant.product.content" => "catalog.read",
        "merchant.product.create"
        | "merchant.category.create"
        | "merchant.category.save"
        | "merchant.asset.publish"
        | "merchant.product.save" => "catalog.write",
        _ => return None,
    })
}
/// Compound admission for manual ordering is identical in discovery and invocation.
pub(crate) fn creation_visible(h: &RequestContext, name: &str) -> bool {
    !matches!(
        name,
        "merchant.order.context" | "merchant.order.review" | "merchant.order.complete"
    ) || [
        "orders.write",
        "customers.read",
        "customers.pii",
        "catalog.read",
    ]
    .iter()
    .all(|s| auth::allowed(h, s))
}
pub(crate) fn requires_pii(name: &str) -> bool {
    name.starts_with("merchant.customer.")
        || matches!(
            name,
            "merchant.customers"
                | "merchant.customer"
                | "merchant.orders"
                | "merchant.order"
                | "merchant.order.transition"
                | "merchant.order.note"
                | "merchant.order.context"
                | "merchant.order.review"
                | "merchant.order.complete"
                | "merchant.delivery.split"
                | "merchant.receipts"
                | "merchant.receipt.create"
        )
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    merchant(a, h)?;
    auth::permit(
        h,
        permission(name).ok_or(bad("Unknown merchant operation"))?,
    )?;
    if requires_pii(name) {
        auth::permit(h, "customers.pii")?;
    }
    let id = || {
        v["id"]
            .as_str()
            .map(str::to_string)
            .ok_or(bad("id required"))
    };
    let criteria = || serde_json::from_value(v.clone()).map_err(|_| bad("Invalid search criteria"));
    let Json(result) = match name {
        "merchant.customer.creation" => {
            customer_create::context(State(a.clone()), h.clone()).await?
        }
        "merchant.customer.create" => {
            customer_create::create(State(a.clone()), h.clone(), Json(v.clone())).await?
        }
        "merchant.order.context" | "merchant.order.review" | "merchant.order.complete" => Json(
            Box::pin(manual_orders::invoke(
                a,
                h,
                name.rsplit('.').next().unwrap(),
                v,
            ))
            .await?,
        ),
        "merchant.grid.plan" => {
            grid_plan::plan(State(a.clone()), h.clone(), Json(v.clone())).await?
        }
        "merchant.customer.lookup" => {
            customer_lookup::lookup(
                State(a.clone()),
                h.clone(),
                axum::extract::Query(criteria()?),
            )
            .await?
        }
        "merchant.customer.addresses" => {
            addresses::list(State(a.clone()), h.clone(), Path(id()?)).await?
        }
        "merchant.customer.address.save" => Json(
            accounts::address_save(a, &merchant(a, h)?, &id()?, v["addressId"].as_str(), v, h)
                .await?,
        ),
        "merchant.customer.address.delete" => Json(
            accounts::address_delete(
                a,
                &merchant(a, h)?,
                &id()?,
                v["addressId"].as_str().ok_or(bad("addressId required"))?,
                v["revision"].as_i64().ok_or(bad("revision required"))?,
                h,
            )
            .await?,
        ),
        "merchant.company" => master_data::read(a, h, v["channelId"].as_str()).await?,
        "merchant.company.save" => {
            master_data::save(a, h, v.clone(), v["channelId"].as_str()).await?
        }
        "merchant.workflow" => workflow::get(State(a.clone()), h.clone()).await?,
        "merchant.workflow.save" => {
            workflow::save(State(a.clone()), h.clone(), Json(v.clone())).await?
        }
        "merchant.products" => {
            commerce::list_products(
                State(a.clone()),
                h.clone(),
                axum::extract::Query(
                    serde_json::from_value(v.clone())
                        .map_err(|_| bad("Invalid catalog criteria"))?,
                ),
            )
            .await?
        }
        "merchant.categories" => {
            crate::categories::list_categories(State(a.clone()), h.clone()).await?
        }
        "merchant.product.create" => {
            commerce::create_product(State(a.clone()), h.clone(), Json(v["product"].clone()))
                .await?
        }
        "merchant.category.create" => {
            crate::categories::create_category(
                State(a.clone()),
                h.clone(),
                Json(v["category"].clone()),
            )
            .await?
        }
        "merchant.category.save" => {
            crate::categories::save_category(
                State(a.clone()),
                h.clone(),
                Path(id()?),
                Json(v["category"].clone()),
            )
            .await?
        }
        "merchant.product.content" => {
            commerce::product_editor(State(a.clone()), h.clone(), Path(id()?)).await?
        }
        "merchant.product.save" => {
            commerce::edit_product(
                State(a.clone()),
                h.clone(),
                Path(id()?),
                Json(v["product"].clone()),
            )
            .await?
        }
        "merchant.product.assets" => {
            crate::assets::list(State(a.clone()), h.clone(), Path(id()?)).await?
        }
        "merchant.asset.publish" => {
            crate::assets::publish(State(a.clone()), h.clone(), Path(id()?), Json(v.clone()))
                .await?
        }

        "merchant.orders" => {
            orders::list(
                State(a.clone()),
                h.clone(),
                axum::extract::Query(criteria()?),
            )
            .await?
        }
        "merchant.order" => orders::detail(State(a.clone()), h.clone(), Path(id()?)).await?,
        "merchant.delivery.split" => {
            commerce::split_delivery(State(a.clone()), h.clone(), Path(id()?), Json(v.clone()))
                .await?
        }
        "merchant.customers" => {
            customers::list(
                State(a.clone()),
                h.clone(),
                axum::extract::Query(criteria()?),
            )
            .await?
        }
        "merchant.customer" => customers::detail(State(a.clone()), h.clone(), Path(id()?)).await?,
        "merchant.customer.save" => {
            customers::save(
                State(a.clone()),
                h.clone(),
                Path(id()?),
                Json(v["customer"].clone()),
            )
            .await?
        }
        "merchant.order.transition" => {
            commerce::transition_order(State(a.clone()), h.clone(), Path(id()?), Json(v.clone()))
                .await?
        }
        "merchant.order.note" => {
            orders::note(State(a.clone()), h.clone(), Path(id()?), Json(v.clone())).await?
        }
        "merchant.receipts" => receipts::list(State(a.clone()), h.clone(), Path(id()?)).await?,
        "merchant.receipt.create" => {
            receipts::create(State(a.clone()), h.clone(), Path(id()?), Json(v.clone())).await?
        }
        "merchant.payment.providers" => {
            payments::providers_route(State(a.clone()), h.clone()).await?
        }
        "merchant.payment.onboarding" => Json(payments::onboarding(a, h, &id()?, v).await?),
        "merchant.payment" => {
            let op = v["operation"].as_str().ok_or(bad("operation required"))?;
            if ![
                "capture",
                "authorize",
                "void",
                "refund",
                "reconcile",
                "cancel",
            ]
            .contains(&op)
                || v["approve"] != true
            {
                return Err(bad("Payment operation and approval required"));
            }
            Json(
                payments::enqueue(
                    a,
                    h,
                    &id()?,
                    op,
                    v["requestKey"].as_str().ok_or(bad("requestKey required"))?,
                    v,
                )
                .await?,
            )
        }
        _ => return Err(bad("Unknown operation")),
    };
    Ok(result)
}
