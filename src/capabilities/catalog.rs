//! Shared catalogue composes native capabilities and cognitive contracts without duplicating authorization.
#[path = "core_catalog.rs"]
mod core;
pub(super) fn definitions() -> Vec<(&'static str, &'static str)> {
    let mut all = core::CORE.to_vec();
    all.extend(COGNITIVE.iter().copied());
    all.extend([
        (
            "merchant.app.history",
            "Read current-permission projected app record versions",
        ),
        (
            "merchant.app.restore",
            "Approve a revision-bound app record restoration",
        ),
    ]);
    all.extend([
        (
            "merchant.site.task",
            "Export a credential-free native shop design task",
        ),
        (
            "merchant.site.propose",
            "Validate a coding-agent page result for explicit review",
        ),
        (
            "merchant.site.plan",
            "Prepare revision-bound visual shop alternatives",
        ),
        (
            "merchant.site.apply",
            "Approve a scoped shop-design proposal in staging",
        ),
    ]);
    all.extend([
        (
            "studio.workspace.read",
            "Read the current personal Studio workspace",
        ),
        (
            "studio.workspace.save",
            "Revise the current personal Studio workspace",
        ),
    ]);
    all.extend(crate::operations::CREATION_CAPABILITIES.iter().copied());
    all.extend(crate::pos::CAPABILITIES.iter().copied());
    all.extend(crate::b2b::CAPABILITIES.iter().copied());
    all
}
const COGNITIVE: &[(&str, &str)] = &[
    (
        "merchant.grid.plan",
        "Plan read-only native list filters; review criteria before applying",
    ),
    (
        "merchant.customer.lookup",
        "Search existing customers by name, email or number",
    ),
    ("team.roles", "Read current tenant role definitions"),
    ("team.role.save", "Revise tenant role grants"),
    ("team.role.dependencies", "Inspect role dependencies"),
    ("team.role.delete", "Remove an unused custom role"),
    (
        "knowledge.behavior",
        "Read consent-bound traffic, browser, destination and product knowledge projections",
    ),
    (
        "knowledge.behavior.journey",
        "Read a private bounded customer or guest journey with PII permission",
    ),
    (
        "knowledge.experiments",
        "List immutable preregistered controlled experiments",
    ),
    (
        "knowledge.experiment.create",
        "Register a bounded consent-required fixed-horizon experiment",
    ),
    (
        "knowledge.experiment.start",
        "Approve starting a registered channel experiment",
    ),
    (
        "knowledge.experiment.stop",
        "Stop early; invalidate causal final readout",
    ),
    (
        "knowledge.experiment.finish",
        "Close enrollment after the preregistered horizon",
    ),
    (
        "knowledge.experiment.report",
        "Read delayed live-cash outcomes with conservative final-only inference",
    ),
    (
        "catalog.facts",
        "Verify short-lived channel-scoped native product facts",
    ),
    (
        "knowledge.autonomy.apply",
        "Apply a price-only proposal within explicit current merchant policy and daily budget",
    ),
    ("knowledge.claims", "Read source-bound product evidence"),
    (
        "knowledge.claim.propose",
        "Persist an unconfirmed source-quoted claim",
    ),
    (
        "knowledge.claim.review",
        "Revision-bound review of a source claim",
    ),
    (
        "knowledge.extract",
        "Extract reviewable candidates from an existing source",
    ),
    (
        "knowledge.compile",
        "Compile exact confirmed public claims; reject invented statements",
    ),
];
