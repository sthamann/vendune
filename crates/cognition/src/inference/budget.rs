//! Durable conservative model allocations use existing agent keys and the live shop stop switch.
//! Counters reserve full envelopes before egress and never refund uncertain calls.
use super::Admission;
use crate::{scoped_pool::ScopedPool, tenant_scope};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::Row;
use std::future::Future;

#[derive(Clone, Debug)]
pub struct Authority {
    pub tenant: String,
    pub key_id: Option<String>,
    pub require_budget: bool,
}
tokio::task_local! { static CURRENT: Authority; }
pub fn is_budgeted() -> bool {
    CURRENT
        .try_with(|a| a.require_budget || a.key_id.is_some())
        .unwrap_or(false)
}
pub async fn scoped<F: Future>(authority: Authority, future: F) -> F::Output {
    CURRENT.scope(authority, future).await
}
/// A key selects its approved model by default; client/provider routing cannot widen that choice.
pub async fn choice(
    db: Option<&ScopedPool>,
    requested: Option<&super::Choice>,
) -> Result<Option<super::Choice>, Admission> {
    let Some(authority) = CURRENT
        .try_with(Clone::clone)
        .ok()
        .filter(|a| a.key_id.is_some())
    else {
        return Ok(requested.cloned());
    };
    let db = db.ok_or("Agent model admission requires durable storage")?;
    let value:Value=tenant_scope::scoped(tenant_scope::Scope::System,sqlx::query_scalar("SELECT agent_budget FROM integration_keys WHERE tenant=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1) AND id=$2 AND expires_at>now()")
        .bind(&authority.tenant).bind(&authority.key_id).fetch_optional(db)).await.map_err(|_|"Agent model admission unavailable")?
        .ok_or(Admission::Denied("Agent key expired or revoked"))?;
    let budget: Budget = serde_json::from_value(value).map_err(|_| "Invalid agent budget")?;
    budget.validate()?;
    if let Some(c) = requested
        && !matches!(c.provider, super::Provider::Platform)
        && (serde_json::to_value(&c.provider).unwrap().as_str() != Some(budget.provider.as_str())
            || c.model.as_ref().is_some_and(|m| m != &budget.model))
    {
        return Err(Admission::Denied(
            "Agent provider or model differs from its approved budget",
        ));
    }
    Ok(Some(super::Choice {
        provider: serde_json::from_value(json!(budget.provider))
            .map_err(|_| "Invalid agent provider")?,
        model: Some(budget.model),
    }))
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Budget {
    pub provider: String,
    pub model: String,
    pub tokens: u64,
    pub cost_micros: u64,
    pub price_per_million_micros: u64,
}
impl Budget {
    pub fn validate(&self) -> Result<(), String> {
        if !["openai", "anthropic", "ollama"].contains(&self.provider.as_str())
            || self.model.is_empty()
            || self.model.len() > 128
            || !self.model.is_ascii()
            || self.model.chars().any(char::is_control)
        {
            return Err("An exact agent provider and model are required".into());
        }
        if [self.tokens, self.cost_micros, self.price_per_million_micros]
            .into_iter()
            .all(|n| (1..=1_000_000_000_000).contains(&n))
        {
            Ok(())
        } else {
            Err(
                "Explicit positive bounded agent token, USD micro-unit and tariff limits required"
                    .into(),
            )
        }
    }
}

/// The charge is an allocation at the operator-selected ceiling tariff, not a provider invoice.
pub fn allocation(request: &Value, images: bool, tariff: u64) -> Result<(u64, u64), String> {
    if images {
        return Err("Budgeted agents currently require text-only model input".into());
    }
    let output = request["max_output_tokens"]
        .as_u64()
        .or_else(|| request["max_completion_tokens"].as_u64())
        .or_else(|| request["max_tokens"].as_u64())
        .or_else(|| request["options"]["num_predict"].as_u64())
        .filter(|n| *n > 0 && *n <= 8192)
        .ok_or("Model request has no bounded output allowance")?;
    // UTF-8 request bytes deliberately overcount ordinary text tokens. Reserve an
    // additional framing allowance; provider-specific metering is not an invoice guarantee.
    let tokens = u64::try_from(request.to_string().len())
        .map_err(|_| "Agent envelope overflow")?
        .checked_add(output)
        .and_then(|n| n.checked_add(4096))
        .ok_or("Agent envelope overflow")?;
    let cost = tokens
        .checked_mul(tariff)
        .and_then(|n| n.checked_add(999_999))
        .map(|n| n / 1_000_000)
        .ok_or("Agent tariff overflow")?;
    Ok((tokens, cost))
}

pub async fn reserve(
    db: Option<&ScopedPool>,
    request: &Value,
    images: bool,
    provider: &str,
) -> Result<(), Admission> {
    let Some(authority) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(());
    };
    if authority.tenant.is_empty() && !authority.require_budget {
        return Ok(());
    }
    let db = db.ok_or("Agent model admission requires durable storage")?;
    tenant_scope::scoped(tenant_scope::Scope::System, async {
        let mut tx=db.begin().await.map_err(|_|"Agent admission unavailable")?;
        // Same order as stop/key lifecycle: live tenant first, then key. No lock
        // survives the provider call. A stop affects subsequent calls, not past egress.
        let shop=sqlx::query("SELECT id,agents_stopped FROM tenants WHERE id=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1) FOR UPDATE")
            .bind(&authority.tenant).fetch_one(&mut *tx).await.map_err(|_|"Agent shop unavailable")?;
        let live:String=shop.get("id");
        let stopped:bool=shop.get("agents_stopped");
        if stopped { return Err(Admission::Denied("Shop agents are stopped by an administrator")); }
        let Some(id)=&authority.key_id else {
            if authority.require_budget { return Err(Admission::Denied("Use a dedicated agent key with explicit budgets")); }
            return Ok(());
        };
        let row=sqlx::query("SELECT i.agent_budget,i.agent_tokens_allocated,i.agent_cost_allocated FROM integration_keys i JOIN membership_grants m ON m.tenant=i.tenant AND m.user_id=i.user_id AND m.active WHERE i.tenant=$1 AND i.id=$2 AND i.expires_at>now() AND i.app_id IS NULL FOR UPDATE OF i")
            .bind(&live).bind(id).fetch_optional(&mut *tx).await.map_err(|_|"Agent admission unavailable")?
            .ok_or(Admission::Denied("Agent key expired, revoked or membership withdrawn"))?;
        let budget:Budget=serde_json::from_value(row.get("agent_budget")).map_err(|_|"Agent budget is missing or invalid")?;
        budget.validate()?;
        if budget.provider!=provider || request["model"].as_str()!=Some(budget.model.as_str()) {return Err(Admission::Denied("Agent provider or model differs from its approved budget"));}
        let (tokens,cost)=allocation(request,images,budget.price_per_million_micros)?;
        let used_tokens=u64::try_from(row.get::<i64,_>("agent_tokens_allocated")).map_err(|_|"Invalid agent usage")?;
        let used_cost=u64::try_from(row.get::<i64,_>("agent_cost_allocated")).map_err(|_|"Invalid agent usage")?;
        if !veyndo_kernel::verified_kernel::b2b_budget_admissible(budget.tokens,used_tokens,tokens)
            || !veyndo_kernel::verified_kernel::b2b_budget_admissible(budget.cost_micros,used_cost,cost) {
            return Err(Admission::Exhausted);
        }
        sqlx::query("UPDATE integration_keys SET agent_tokens_allocated=agent_tokens_allocated+$3,agent_cost_allocated=agent_cost_allocated+$4 WHERE tenant=$1 AND id=$2")
            .bind(&live).bind(id).bind(tokens as i64).bind(cost as i64).execute(&mut *tx).await.map_err(|_|"Agent usage could not be reserved")?;
        sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'intelligence.agent.allocated',$2)")
            .bind(&live).bind(json!({"agentId":id,"tokens":tokens,"costMicros":cost,"currency":"USD"})).execute(&mut *tx).await.map_err(|_|"Agent audit could not be saved")?;
        tx.commit().await.map_err(|_|Admission::Unavailable("Agent admission could not commit"))
    }).await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn explicit_bounded_envelopes_reject_missing_limits_images_and_overflow() {
        let budget = Budget {
            provider: "openai".into(),
            model: "synthetic".into(),
            tokens: 100_000,
            cost_micros: 1000,
            price_per_million_micros: 100,
        };
        assert!(budget.validate().is_ok());
        assert!(
            Budget {
                tokens: 0,
                ..budget
            }
            .validate()
            .is_err()
        );
        let r = json!({"max_output_tokens":8192,"input":"hello"});
        let (tokens, cost) = allocation(&r, false, 1_000_000).unwrap();
        assert!(tokens > 8192);
        assert_eq!(tokens, cost);
        assert!(allocation(&r, true, 10).is_err());
        assert!(allocation(&json!({"input":"hello"}), false, 10).is_err());
        assert!(allocation(&r, false, u64::MAX).is_err());
    }
}
