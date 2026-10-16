//! Closed native domain routing selected once by the operation registry; inactive futures stay boxed.
use super::*;
#[derive(Clone, Copy)]
pub(super) enum Owner {
    CatalogIntake,
    Runs,
    Personal,
    Site,
    AppHistory,
    Roles,
    B2b,
    Pos,
    Facts,
    Cognitive,
    Currencies,
    Legal,
    History,
    Media,
    International,
    Automation,
    Operations,
    Developer,
    Knowledge,
    Native,
}
impl Owner {
    pub(super) fn for_name(name: &str) -> Self {
        if name.starts_with("merchant.catalog.") {
            Self::CatalogIntake
        } else if name.starts_with("merchant.run.") || name.starts_with("merchant.agents.") {
            Self::Runs
        } else if name.starts_with("studio.workspace.") {
            Self::Personal
        } else if name.starts_with("merchant.site.") {
            Self::Site
        } else if name.starts_with("merchant.app.") {
            Self::AppHistory
        } else if name.starts_with("team.role") {
            Self::Roles
        } else if name.starts_with("b2b.") {
            Self::B2b
        } else if name.starts_with("pos.") {
            Self::Pos
        } else if name == "catalog.facts" {
            Self::Facts
        } else if cognition::contracts::schema(name).is_some() {
            Self::Cognitive
        } else if currencies::schema(name).is_some() {
            Self::Currencies
        } else if legal::schema(name).is_some() {
            Self::Legal
        } else if history::schema(name).is_some() {
            Self::History
        } else if name.starts_with("merchant.media.") {
            Self::Media
        } else if commerce::international_permission(name).is_some() {
            Self::International
        } else if name.starts_with("automation.") {
            Self::Automation
        } else if operations::permission(name).is_some() {
            Self::Operations
        } else if name.starts_with("developer.") {
            Self::Developer
        } else if documents::knowledge_schema(name).is_some() {
            Self::Knowledge
        } else {
            Self::Native
        }
    }
    pub(super) fn invoke<'a>(
        self,
        a: &'a App,
        h: &'a RequestContext,
        name: &'a str,
        v: &'a Value,
    ) -> CapabilityFuture<'a> {
        match self {
            Self::CatalogIntake => Box::pin(commerce::catalog_intake::invoke(a, h, name, v)),
            Self::Runs => Box::pin(agent_runs::invoke(a, h, name, v)),
            Self::Personal => Box::pin(studio::personal::invoke(a, h, name, v)),
            Self::Site => Box::pin(apps::site_builder::design_agent::invoke(a, h, name, v)),
            Self::AppHistory => Box::pin(apps::record_history::invoke(a, h, name, v)),
            Self::Roles => Box::pin(auth::roles::invoke(a, h, name, v)),
            Self::B2b => Box::pin(b2b::invoke(a, h, name, v)),
            Self::Pos => Box::pin(pos::invoke(a, h, name.strip_prefix("pos.").unwrap(), v)),
            Self::Facts => Box::pin(async move {
                cognition::signed::facts(
                    a,
                    h,
                    v["productId"].as_str().ok_or(bad("Product required"))?,
                )
                .await
            }),
            Self::Cognitive => Box::pin(cognition::contracts::invoke_contract(a, h, name, v)),
            Self::Currencies => Box::pin(currencies::invoke(a, h, name, v)),
            Self::Legal => Box::pin(legal::invoke(a, h, name, v)),
            Self::History => Box::pin(history::invoke(a, h, name, v)),
            Self::Media => Box::pin(assets::media_invoke(a, h, name, v)),
            Self::International => Box::pin(commerce::international_invoke(a, h, name, v)),
            Self::Automation => Box::pin(marketing::invoke(a, h, name, v)),
            Self::Operations => Box::pin(operations::invoke(a, h, name, v)),
            Self::Developer => Box::pin(developer::invoke(a, h, name, v)),
            Self::Knowledge => Box::pin(documents::knowledge_invoke(a, h, name, v)),
            Self::Native => Box::pin(invoke_native(a, h, name, v)),
        }
    }
}
