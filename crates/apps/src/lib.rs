//! Isolated app component execution; no HTTP, SQL or inference authority.
pub use veyndo_kernel::verified_kernel;
pub mod component_runtime;
pub mod sandbox;
mod sandbox_engine;
