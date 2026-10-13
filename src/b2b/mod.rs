//! Native modular company procurement; protocol-specific EDI adapters remain in their app packages.
use crate::*;
mod settings;
pub(crate) use settings::Config;
mod access;
mod approval;
mod catalog;
mod gateway;
mod lists;
mod model;
mod onboarding;
mod orders;
mod organization;
pub(crate) use organization::save as restore_configuration;
mod purchase;
mod quick_order;
mod quote_contract;
mod quotes;
mod requisition;
mod staging;
use access::{access, catalog_guard, identity, require};
pub(crate) use access::{guard, guard_conn, surface_context};
pub(crate) use catalog::{admit as admit_catalog, scope as catalog_scope};
pub(crate) use gateway::permission;
pub(crate) use gateway::{CAPABILITIES, invoke, schema};
pub(crate) use model::Context;
use model::{Access, Company, Member, Unit};
pub(crate) use purchase::{check_locked, lock_unit, preview, record, release_budget};
pub(crate) use quote_contract::{consume as consume_quote, prices as contract_prices};
pub(crate) use staging::{clone_configuration, publish_configuration, snapshot_configuration};
pub(crate) fn router() -> Router<App> {
    Router::new()
        .secure_route(
            "/api/b2b/{operation}",
            &[("POST", "read")],
            post(gateway::admin),
        )
        .route("/store-api/b2b/{operation}", post(gateway::customer))
        .route(
            "/store-api/b2b/units/{unit}/orders/{id}/receipts/{receipt}/pdf",
            get(orders::receipt),
        )
}
