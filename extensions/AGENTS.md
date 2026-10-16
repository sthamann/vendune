# extensions ownership

Root AGENTS.md also applies. Rules below were moved from the root, not weakened.

## App lifecycle and independent reference services

Native record lifecycle declarations are generic Manifest contracts implemented
by `src/apps/record_lifecycle.rs`; application-specific states/edges belong only
to their package. AI edits must preserve existing lifecycle/identity constraints.
Record writes must retain the installed-package advisory fence and transactional
digest check; do not replace it with cached approval or a second write API.
Network admission must use `apps/service_limits.rs` across every app egress lane,
with the tenant aggregate and database leases retained across replicas.

`extensions/apps/erp-handoff/service/` owns its independent Rust process, receipt
schema, provider protocol and configuration; its app-local tests are invoked by
registered `scripts/erp_handoff.py`. `extensions/sdk/rust-events.rs` is generic
wire verification. Do not move ERP/returns code or app receipt tables to core
system directories. Do not implement automatic retries for ambiguous ERP effects
or give the service a core-owner/RLS-bypass database role. Native preview/staging
continues to block external effects. Existing mapping schemas require explicit
owned-order migration before making the new order reference required.

