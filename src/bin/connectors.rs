//! Independent Rust standard-app service; no provider code executes in commerce request workers.
use veyndo::{money, network_policy, verified_kernel};
#[path = "../../extensions/services/connectors/src/mod.rs"]
mod connectors;
#[tokio::main]
async fn main() {
    if connectors::run().await.is_err() {
        eprintln!("Connector startup failed; check database, keys and migration 049");
        std::process::exit(1);
    }
}
