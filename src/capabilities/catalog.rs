//! Shared catalogue composes native capabilities and cognitive contracts without duplicating authorization.
#[path = "core_catalog.rs"]
mod core;
pub(crate) static CAPABILITIES: std::sync::LazyLock<Vec<(&'static str, &'static str)>> =
    std::sync::LazyLock::new(|| {
        let mut all = core::CORE.to_vec();
        all.extend(COGNITIVE.iter().copied());
        all.extend(crate::operations::CREATION_CAPABILITIES.iter().copied());
        all.extend(crate::pos::CAPABILITIES.iter().copied());
        all.extend(crate::b2b::CAPABILITIES.iter().copied());
        all
    });
const COGNITIVE: &[(&str, &str)] = &[
    (
        "merchant.grid.plan",
        "Plan read-only native list filters; review criteria before applying",
    ),
    (
        "merchant.customer.lookup",
        "Search existing customers by name, email or number",
    ),
    (
        "b2b.company.create",
        "Create a company with a first purchasing unit",
    ),
    (
        "b2b.settings.save",
        "Configure native company purchasing features",
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
