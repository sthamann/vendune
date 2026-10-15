//! MCP discovery applies current merchant permissions through the same capability owners as invocation.
use crate::*;
pub(super) fn visible(a: &App, h: &RequestContext, name: &str) -> bool {
    let n = &name;
    if n.starts_with("merchant.app.") {
        return merchant(a, h).is_ok()
            && auth::allowed(h, "apps.read")
            && auth::allowed(h, "catalog.read")
            && (*n != "merchant.app.restore" || auth::allowed(h, "apps.manage"));
    }
    if n.starts_with("merchant.site.") {
        return merchant(a, h).is_ok()
            && auth::allowed(h, "channels.read")
            && auth::allowed(h, "channels.manage")
            && auth::allowed(h, "assistant.use");
    }
    if n.starts_with("studio.workspace.") {
        return merchant(a, h).is_ok() && h.principal.personal_session;
    }

    if auth::roles::schema(n).is_some() {
        return merchant(a, h).is_ok() && auth::allowed(h, "team.manage");
    }
    if let Some(scope) = b2b::permission(n) {
        return merchant(a, h).is_ok() && auth::allowed(h, scope);
    }
    if n.starts_with("pos.") {
        return merchant(a, h).is_ok() && auth::allowed(h, "pos.use");
    }
    if let Some(permission) = currencies::permission(n) {
        return merchant(a, h).is_ok() && auth::permit(h, permission).is_ok();
    }
    if let Some(permission) = legal::permission(n) {
        return merchant(a, h).is_ok() && auth::permit(h, permission).is_ok();
    }
    if history::schema(n).is_some() {
        return merchant(a, h).is_ok() && history::visible(h, n);
    }
    if let Some(permission) = assets::media_permission(n) {
        return merchant(a, h).is_ok() && auth::permit(h, permission).is_ok();
    }
    if let Some(permission) = commerce::international_permission(n) {
        return merchant(a, h).is_ok() && auth::permit(h, permission).is_ok();
    }
    if n.starts_with("automation.") {
        return merchant(a, h).is_ok() && marketing::capability_visible(h, n);
    }
    if *n == "knowledge.autonomy.apply" {
        return auth::allowed(h, "knowledge.read")
            && auth::allowed(h, "catalog.write")
            && auth::allowed(h, "settings.write");
    }
    if *n == "knowledge.behavior.journey" {
        return merchant(a, h).is_ok() && auth::allowed(h, "customers.pii");
    }
    if n.starts_with("knowledge.") {
        return merchant(a, h).is_ok()
            && auth::permit(h, "knowledge.read").is_ok()
            && (!matches!(
                *n,
                "knowledge.claim.propose"
                    | "knowledge.claim.review"
                    | "knowledge.extract"
                    | "knowledge.source.create"
                    | "knowledge.source.edit"
                    | "knowledge.source.visibility"
                    | "knowledge.source.archive"
            ) || auth::permit(h, "knowledge.write").is_ok());
    }
    if *n == "merchant.grid.plan" {
        return merchant(a, h).is_ok() && operations::grid_visible(h);
    }
    if let Some(permission) = operations::permission(n) {
        return merchant(a, h).is_ok()
            && auth::permit(h, permission).is_ok()
            && operations::creation_visible(h, n)
            && (!operations::requires_pii(n) || auth::allowed(h, "customers.pii"));
    }
    if n.starts_with("developer.") {
        return merchant(a, h).is_ok()
            && auth::permit(
                h,
                if *n == "developer.builds" {
                    "developer.read"
                } else {
                    "developer.manage"
                },
            )
            .is_ok();
    }
    if ["merchant.plan", "merchant.apply"].contains(n) {
        return merchant(a, h).is_ok()
            && agent::assistant_access(h).is_ok()
            && (*n != "merchant.apply" || auth::allowed(h, "catalog.write"));
    }
    !(n.starts_with("merchant.") || n.starts_with("knowledge."))
        || merchant(a, h).is_ok() && (*n != "merchant.apply" || auth::permit(h, "catalog").is_ok())
}
