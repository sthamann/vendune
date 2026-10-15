//! Personal merchant accounts, tenant memberships, scoped sessions and role enforcement.
//! The legacy MERCHANT_TOKEN is an instance administrator bootstrap credential only.

mod abuse;
pub(crate) mod broker;
pub(crate) mod broker_credentials;
pub(crate) mod broker_inference;
pub(crate) mod broker_recovery;
pub(crate) mod broker_session;
pub(crate) mod browser;
mod credentials;
mod dto;
pub(crate) mod handoff;
mod identity;
mod integrations;
mod invitations;
pub(crate) use integrations::*;
mod members;
mod middleware;
pub(crate) mod roles;
pub(crate) mod route_policy;
pub(crate) use route_policy::SecureRoutes;
mod permissions;
pub(crate) use permissions::*;
mod provision;
pub(crate) mod recovery_entry;
mod registration;
pub(crate) use provision::{create_workspace, provision_shop};
pub(crate) mod mfa;
mod sessions;
mod totp;
pub(crate) use credentials::*;
pub(crate) use invitations::*;
pub(crate) use members::*;
pub(crate) use middleware::*;
pub(crate) use registration::*;
pub(crate) use sessions::*;

mod routes;
pub(crate) use routes::entry_router;
