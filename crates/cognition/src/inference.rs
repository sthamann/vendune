//! Provider adapters. Credentials stay on the server; domain validation is separate.
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::env;
pub mod budget;
mod error;
pub use error::{Admission, InferenceError};
mod protocol;
mod request;
pub mod settings;
mod tools;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    #[default]
    Platform,
    Ollama,
    Openai,
    Anthropic,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Choice {
    #[serde(default)]
    pub provider: Provider,
    pub model: Option<String>,
}
#[derive(Clone)]
pub struct Inference {
    db: Option<crate::scoped_pool::ScopedPool>,
    /// Configuration snapshots may clear db; durable admission must retain its owner.
    budget_db: Option<crate::scoped_pool::ScopedPool>,
    settings: std::sync::Arc<tokio::sync::Mutex<Option<(std::time::Instant, Value)>>>,
    default_provider: Provider,
    disabled: Vec<String>,
    ollama_key: Option<String>,
    http: reqwest::Client,
    ollama: String,
    local_model: String,
    openai_url: String,
    openai_key: Option<String>,
    openai_model: String,
    anthropic_url: String,
    anthropic_key: Option<String>,
    anthropic_model: String,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Output {
    pub value: Value,
    pub model: String,
    pub provider: Provider,
    pub usage: Value,
}
impl Inference {
    pub fn from_env(http: reqwest::Client) -> Self {
        let key = |name| env::var(name).ok().filter(|s| !s.is_empty());
        Self {
            db: None,
            budget_db: None,
            settings: Default::default(),
            default_provider: Provider::Ollama,
            disabled: vec![],
            ollama_key: None,
            http,
            ollama: env::var("OLLAMA_URL").unwrap_or("http://127.0.0.1:11434".into()),
            local_model: env::var("OLLAMA_MODEL").unwrap_or("qwen3.6:35b".into()),
            openai_url: env::var("OPENAI_BASE_URL").unwrap_or("https://api.openai.com/v1".into()),
            openai_key: key("OPENAI_API_KEY"),
            openai_model: env::var("OPENAI_MODEL").unwrap_or("gpt-6-sol".into()),
            anthropic_url: env::var("ANTHROPIC_BASE_URL")
                .unwrap_or("https://api.anthropic.com/v1".into()),
            anthropic_key: key("ANTHROPIC_API_KEY"),
            anthropic_model: env::var("ANTHROPIC_MODEL").unwrap_or("claude-sonnet-5-5".into()),
        }
    }
    pub fn providers(&self) -> Value {
        let current = match self.default_provider {
            Provider::Openai => &self.openai_model,
            Provider::Anthropic => &self.anthropic_model,
            _ => &self.local_model,
        };
        let configured = match self.default_provider {
            Provider::Openai => self.openai_key.is_some(),
            Provider::Anthropic => self.anthropic_key.is_some(),
            _ => true,
        } && !self.disabled.iter().any(|v| {
            Some(v.as_str())
                == serde_json::to_value(&self.default_provider)
                    .unwrap()
                    .as_str()
        });
        json!({"providers":[
            {"id":"platform","name":"Platform default","model":current,"configured":configured},
            {"id":"ollama","name":"Local / open weights","model":self.local_model,"configured":!self.disabled.iter().any(|v|v=="ollama")},
            {"id":"openai","name":"OpenAI","model":self.openai_model,"configured":self.openai_key.is_some() && !self.disabled.iter().any(|v|v=="openai")},
            {"id":"anthropic","name":"Claude","model":self.anthropic_model,"configured":self.anthropic_key.is_some() && !self.disabled.iter().any(|v|v=="anthropic")}
        ],"defaultProvider":self.default_provider,"credentials":"platform-inherited-server-only"})
    }
    pub async fn structured(
        &self,
        choice: Option<&Choice>,
        system: &str,
        user: &str,
        schema: &Value,
    ) -> Result<Output, InferenceError> {
        let admitted = Box::pin(budget::choice(self.budget_db.as_ref(), choice)).await?;
        let choice = admitted.as_ref();
        let runtime = self.resolved().await?;
        runtime
            .structured_resolved(choice, system, user, schema, &[])
            .await
    }
    /// Route tasks through the resolved central provider; an explicit caller model always wins.
    pub async fn structured_for(
        &self,
        task: &str,
        choice: Option<&Choice>,
        system: &str,
        user: &str,
        schema: &Value,
    ) -> Result<Output, InferenceError> {
        let admitted = Box::pin(budget::choice(self.budget_db.as_ref(), choice)).await?;
        let choice = admitted.as_ref();
        if !["planner", "extraction", "concierge"].contains(&task) {
            return Err("Unknown inference task".into());
        }
        let runtime = self.resolved().await?;
        let provider = match choice.map(|c| c.provider.clone()) {
            Some(Provider::Platform) | None => runtime.default_provider.clone(),
            Some(p) => p,
        };
        let suffix = serde_json::to_value(&provider)
            .unwrap()
            .as_str()
            .unwrap()
            .to_uppercase();
        let mut routed = choice.cloned().unwrap_or(Choice {
            provider: provider.clone(),
            model: None,
        });
        if (routed.model.is_none() || matches!(routed.provider, Provider::Platform))
            && let Ok(model) = env::var(format!(
                "INFERENCE_MODEL_{}_{}",
                task.to_uppercase(),
                suffix
            ))
        {
            routed = Choice {
                provider,
                model: Some(model),
            };
        }
        runtime
            .structured_resolved(Some(&routed), system, user, schema, &[])
            .await
    }
    /// Multimodal input uses the same centrally inherited settings and bounded provider output.
    pub async fn structured_with_images(
        &self,
        choice: Option<&Choice>,
        system: &str,
        user: &str,
        schema: &Value,
        images: &[String],
    ) -> Result<Output, InferenceError> {
        let admitted = Box::pin(budget::choice(self.budget_db.as_ref(), choice)).await?;
        let choice = admitted.as_ref();
        self.resolved()
            .await?
            .structured_resolved(choice, system, user, schema, images)
            .await
    }
}
use protocol::parse;
mod schema;
#[cfg(test)]
mod tests;
use schema::strict_schema;
