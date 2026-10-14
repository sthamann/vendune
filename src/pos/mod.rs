//! Authenticated POS adapters reuse the native catalog/cart/checkout/receipt and durable event owners.
use crate::*;
mod config;
mod customer;
pub(crate) use customer::check as check_customer;
mod discount;
pub(crate) use discount::{Discount, apply as adjust_quote};
mod gateway;
mod input;
mod schema;
mod settlement;
mod workspace_gateway;
pub(crate) use config::{Config, configure, validate_channel};
pub(crate) use gateway::invoke;
pub(crate) use schema::schema;
pub(crate) use settlement::{check_locked, payment_captured, settle, validate_settlement};
#[derive(Clone, Debug)]
pub(crate) struct Admission {
    pub actor: String,
    pub tender_minor: Option<u64>,
}
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "pos.customers",
        "Search active tenant customers or resolve a customer-number card",
    ),
    (
        "pos.customer",
        "Revision-checked cashier attachment of an existing customer",
    ),
    (
        "pos.discount",
        "Audited exact cashier discount through shared pricing",
    ),
    (
        "pos.receipt",
        "Read printable lines from an existing immutable issued invoice",
    ),
    (
        "pos.channels",
        "Discover the tenant POS registers through cashier admission",
    ),
    (
        "pos.payment",
        "Read the owned sale payment and authoritative order",
    ),
    (
        "pos.reconcile",
        "Reconcile the owned provider attempt through existing durable jobs",
    ),
    (
        "pos.catalog",
        "Search channel products or resolve a barcode for an authenticated cashier",
    ),
    (
        "pos.context",
        "Read POS configuration without creating a cart",
    ),
    (
        "pos.detail",
        "Read native product families and variant prices",
    ),
    (
        "pos.currency",
        "Select an enabled channel currency through native pricing",
    ),
    (
        "pos.coupons",
        "Apply coupon codes through the native promotion owner",
    ),
    ("pos.create", "Create an actor-bound native POS cart"),
    (
        "pos.cart",
        "Read an owned POS cart and its authoritative quote",
    ),
    ("pos.replace", "Revision-checked native POS cart edit"),
    (
        "pos.select",
        "Select customer/contact and a configured payment through the shared checkout",
    ),
    (
        "pos.accept",
        "Record explicit current legal acknowledgements through the shared legal owner",
    ),
    (
        "pos.complete",
        "Idempotent native POS checkout, cash tender in exact currency minor units",
    ),
    (
        "pos.held",
        "List this cashier's held carts in this sales channel",
    ),
    (
        "pos.sales",
        "Read recent channel orders and cash tender records",
    ),
];
pub(crate) fn router() -> Router<App> {
    Router::new()
        .secure_route(
            "/api/pos/channels",
            &[("GET", "pos.use")],
            get(gateway::channels),
        )
        .secure_route(
            "/api/pos/{channel}/{operation}",
            &[("POST", "pos.use")],
            post(gateway::route),
        )
}
/// Also invoked by ordinary cart adapters. A stolen POS token is not merchant or channel admission.
pub(crate) fn guard_cart(h: &RequestContext, c: &StoredCart) -> Result<()> {
    operations::guard_admin_cart(h, c)?;
    if c.data.pos_actor.is_some()
        && !h
            .pos
            .as_ref()
            .is_some_and(|p| c.data.pos_actor.as_deref() == Some(&p.actor))
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "POS cart belongs to another cashier or requires POS admission".into(),
        ));
    }
    if c.data.sales_channel != marketing::channel_id(h) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Cart belongs to another sales channel".into(),
        ));
    }
    if c.data.pos_actor.is_some() && c.data.customer_id.is_some() {
        auth::permit(h, "customers.read")?;
        auth::permit(h, "customers.pii")?;
    }
    Ok(())
}
