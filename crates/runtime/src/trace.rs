//! Private task-local correlation IDs; tracing never authorizes an operation or records payloads.
use std::future::Future;
tokio::task_local! { static TRACE: String; }
pub fn fresh() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}
pub fn current() -> String {
    TRACE.try_with(Clone::clone).unwrap_or_default()
}
pub async fn scoped<T>(id: String, future: impl Future<Output = T>) -> T {
    let id = if id.len() == 32 && id.bytes().all(|b| b.is_ascii_hexdigit()) {
        id
    } else {
        fresh()
    };
    TRACE.scope(id, future).await
}
