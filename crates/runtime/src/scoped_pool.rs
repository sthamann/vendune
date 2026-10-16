//! The commerce database executor: transaction-local tenant scope, including direct queries and cancelled streams.
use crate::tenant_scope::{Scope, current};
use futures_util::{StreamExt, future::BoxFuture, stream::BoxStream};
use sqlx::{
    Describe, Either, Error, Execute, Executor, Postgres, Transaction,
    postgres::{PgQueryResult, PgRow, PgStatement, PgTypeInfo},
};
use std::sync::{Arc, RwLock};
#[derive(Clone, Debug)]
pub struct ScopedPool {
    pool: sqlx::PgPool,
    transaction_mode: bool,
    system: Option<sqlx::PgPool>,
    signer: Option<Arc<RwLock<crate::database_scope::Signer>>>,
}
impl ScopedPool {
    pub fn new(pool: sqlx::PgPool, transaction_mode: bool) -> Self {
        Self {
            pool,
            transaction_mode,
            system: None,
            signer: None,
        }
    }
    pub fn with_authority(
        pool: sqlx::PgPool,
        system: sqlx::PgPool,
        signer: crate::database_scope::Signer,
    ) -> Self {
        Self {
            pool,
            system: Some(system),
            transaction_mode: true,
            signer: Some(Arc::new(RwLock::new(signer))),
        }
    }
    pub fn size(&self) -> u32 {
        self.pool.size() + self.system.as_ref().map_or(0, sqlx::PgPool::size)
    }
    pub fn num_idle(&self) -> usize {
        self.pool.num_idle() + self.system.as_ref().map_or(0, sqlx::PgPool::num_idle)
    }
    pub async fn close(&self) {
        self.pool.close().await;
        if let Some(system) = &self.system {
            system.close().await;
        }
    }
    pub async fn begin(&self) -> Result<Transaction<'static, Postgres>, Error> {
        self.begin_scoped(current(), false).await
    }
    pub async fn begin_read_snapshot(&self) -> Result<Transaction<'static, Postgres>, Error> {
        self.begin_scoped(current(), true).await
    }
    pub async fn refresh_authority(&self) -> Result<(), Error> {
        let (Some(system), Some(signer)) = (&self.system, &self.signer) else {
            return Ok(());
        };
        let role: String =
            sqlx::query_scalar("SELECT tenant_login::text FROM public.veyndo_scope_key()")
                .fetch_one(system)
                .await?;
        let refreshed = crate::database_scope::Signer::load(system, &role).await?;
        *signer
            .write()
            .map_err(|_| Error::Protocol("Database scope signer unavailable".into()))? = refreshed;
        Ok(())
    }
    /// Only trusted native schema/provisioning owners call this; transport/app code never receives the pool.
    pub async fn begin_privileged(&self) -> Result<Transaction<'static, Postgres>, Error> {
        self.begin_scoped(Scope::System, false).await
    }
    async fn begin_scoped(
        &self,
        scope: Scope,
        read_only: bool,
    ) -> Result<Transaction<'static, Postgres>, Error> {
        let pool = if matches!(scope, Scope::System) {
            self.system.as_ref().unwrap_or(&self.pool)
        } else {
            &self.pool
        };
        let ticket = self
            .signer
            .as_ref()
            .map(|s| {
                s.read()
                    .map_err(|_| Error::Protocol("Database scope signer unavailable".into()))?
                    .ticket(&scope)
            })
            .transpose()?
            .unwrap_or_default();
        let mut tx = pool
            .begin_with(sqlx::AssertSqlSafe(begin_statement(scope, read_only)?))
            .await?;
        // Bound parameters keep bearer scope tickets out of pg_stat_activity query text.
        sqlx::query("SELECT set_config('veyndo.scope_ticket',$1,true)")
            .bind(ticket)
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }
}
fn begin_statement(scope: Scope, read_only: bool) -> Result<String, Error> {
    let (tenant, actor, system) = match scope {
        Scope::Tenant(t) => (t, String::new(), "off"),
        Scope::Personal { tenant, actor } | Scope::Actor { tenant, actor } => {
            (tenant, actor, "off")
        }
        Scope::System => (String::new(), String::new(), "on"),
        Scope::Denied => (String::new(), String::new(), "off"),
    };
    // Only a closed identifier alphabet enters this audited multi-statement BEGIN; no caller SQL is interpolated.
    if !crate::database_scope::identifier(&tenant) || !crate::database_scope::identifier(&actor) {
        return Err(Error::Protocol("Invalid database tenant scope".into()));
    }
    let begin = if read_only {
        "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"
    } else {
        "BEGIN"
    };
    let trace = crate::trace::current();
    debug_assert!(
        trace.is_empty() || trace.len() == 32 && trace.bytes().all(|b| b.is_ascii_hexdigit())
    );
    Ok(format!(
        "{begin}; SET LOCAL rac.tenant = '{tenant}'; SET LOCAL rac.actor = '{actor}'; SET LOCAL rac.system = '{system}'; SET LOCAL veyndo.scope_ticket = ''; SET LOCAL veyndo.trace_id = '{trace}'"
    ))
}
impl<'c> Executor<'c> for &'c ScopedPool {
    type Database = Postgres;
    fn fetch_many<'e, 'q: 'e, E>(
        self,
        query: E,
    ) -> BoxStream<'e, Result<Either<PgQueryResult, PgRow>, Error>>
    where
        'c: 'e,
        E: Execute<'q, Postgres> + 'q,
    {
        if !self.transaction_mode {
            return (&self.pool).fetch_many(query);
        }
        Box::pin(async_stream::try_stream! {
            let mut tx=self.begin().await?;
            {
                let mut stream=(&mut *tx).fetch_many(query);
                while let Some(row)=stream.next().await { yield row?; }
            }
            tx.commit().await?;
        })
    }
    fn fetch_optional<'e, 'q: 'e, E>(self, query: E) -> BoxFuture<'e, Result<Option<PgRow>, Error>>
    where
        'c: 'e,
        E: Execute<'q, Postgres> + 'q,
    {
        if !self.transaction_mode {
            return (&self.pool).fetch_optional(query);
        }
        Box::pin(async move {
            let mut tx = self.begin().await?;
            let row = (&mut *tx).fetch_optional(query).await?;
            tx.commit().await?;
            Ok(row)
        })
    }
    fn prepare_with<'e>(
        self,
        sql: sqlx::SqlStr,
        parameters: &'e [PgTypeInfo],
    ) -> BoxFuture<'e, Result<PgStatement, Error>>
    where
        'c: 'e,
    {
        if !self.transaction_mode {
            return (&self.pool).prepare_with(sql, parameters);
        }
        Box::pin(async move {
            let mut tx = self.begin().await?;
            let statement = (&mut *tx).prepare_with(sql, parameters).await?;
            tx.commit().await?;
            Ok(statement)
        })
    }
    fn describe<'e>(self, sql: sqlx::SqlStr) -> BoxFuture<'e, Result<Describe<Postgres>, Error>>
    where
        'c: 'e,
    {
        if !self.transaction_mode {
            return (&self.pool).describe(sql);
        }
        Box::pin(async move {
            let mut tx = self.begin().await?;
            let result = (&mut *tx).describe(sql).await?;
            tx.commit().await?;
            Ok(result)
        })
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn context_literals_have_a_closed_alphabet_and_always_set_local() {
        assert!(begin_statement(Scope::Tenant("a'; SET rac.system='on".into()), false).is_err());
        let denied = begin_statement(Scope::Denied, false).unwrap();
        assert!(
            begin_statement(Scope::Denied, true)
                .unwrap()
                .starts_with("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;")
        );
        assert!(
            denied.contains("SET LOCAL rac.tenant = ''")
                && denied.contains("SET LOCAL rac.system = 'off'")
        );
    }
}
