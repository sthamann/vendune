//! Explicit per-process database budgets and bounded queue waits; invalid deployment values fail fast.
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;

/// Retry only transient connection admission during a bounded startup window.
/// Authority/configuration audits still run normally and fail closed afterward.
pub(super) async fn connect(
    options: PgPoolOptions,
    url: &str,
) -> Result<sqlx::PgPool, sqlx::Error> {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(90);
    let mut delay = Duration::from_millis(500);
    loop {
        match tokio::time::timeout_at(deadline, options.clone().connect(url)).await {
            Ok(Ok(pool)) => return Ok(pool),
            Ok(Err(error)) if transient(&error) && tokio::time::Instant::now() < deadline => {
                // Never log the connection URL, credentials or raw provider diagnostics.
                eprintln!("Database connection temporarily unavailable; retrying startup");
                tokio::time::sleep_until((tokio::time::Instant::now() + delay).min(deadline)).await;
                delay = (delay * 2).min(Duration::from_secs(5));
            }
            Ok(Err(error)) => return Err(error),
            Err(_) => return Err(sqlx::Error::PoolTimedOut),
        }
    }
}
fn transient(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Io(_) | sqlx::Error::PoolTimedOut => true,
        sqlx::Error::Database(error) => error
            .code()
            .is_some_and(|code| matches!(code.as_ref(), "57P01" | "57P02" | "57P03" | "53300")),
        _ => false,
    }
}
pub(crate) fn pool_options() -> PgPoolOptions {
    let config = crate::runtime_config::get();
    options(config.db_pool_max, config.db_pool_min)
}

pub(super) fn options(max: u32, min: u32) -> PgPoolOptions {
    let config = crate::runtime_config::get();
    let options = PgPoolOptions::new()
        .max_connections(max)
        .min_connections(min)
        .acquire_timeout(Duration::from_millis(config.db_wait_ms.into()))
        .idle_timeout(Duration::from_secs(300))
        .max_lifetime(Duration::from_secs(1800));
    if config.transaction_pooling {
        return options;
    }
    options
        .after_connect(|conn, _| {
            Box::pin(async move {
                sqlx::raw_sql("SET search_path = public; SET jit = off")
                    .execute(&mut *conn)
                    .await?;
                super::row_security::bind(conn).await?;
                Ok(())
            })
        })
        .before_acquire(|conn, _| {
            Box::pin(async move {
                super::row_security::bind(conn).await?;
                Ok(true)
            })
        })
    // Do not issue a second reset query on return. Every checkout, including unscoped
    // tasks, MUST rebind before use; failed/cancelled acquire discards the connection.
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bad_configuration_and_query_failures_are_not_connection_retries() {
        assert!(transient(&sqlx::Error::Io(std::io::Error::from(
            std::io::ErrorKind::ConnectionRefused
        ))));
        assert!(transient(&sqlx::Error::PoolTimedOut));
        assert!(!transient(&sqlx::Error::Configuration(
            "invalid database URL".into()
        )));
        assert!(!transient(&sqlx::Error::RowNotFound));
    }
}
