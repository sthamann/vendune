//! Shared dependency names for native domain modules; no process setup or business rules.
pub(crate) use argon2::{Argon2, PasswordHasher, password_hash::SaltString};
pub(crate) use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
pub(crate) use serde::{Deserialize, Serialize};
pub(crate) use serde_json::{Value, json};
pub(crate) use sha2::{Digest, Sha256};
pub(crate) use sqlx::{Row, postgres::PgPoolOptions};
pub(crate) use std::{collections::HashMap, env, sync::Arc};
pub(crate) use uuid::Uuid;
pub(crate) use vendune::scoped_pool::ScopedPool as PgPool;
pub(crate) use vendune::{
    inference::{Choice, Inference},
    knowledge,
    pricing::{PriceInput, calculate, math_round},
    sandbox::Sandbox,
    verified_kernel,
};
