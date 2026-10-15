# Connected platform hardening

This work follows the 15 October 2026 source review against `3034beb`. It is a
tracked implementation programme, not a claim that every review proposal is
already delivered. The [business-capability design](business-capabilities.md)
builds on these repairs rather than introducing another operation or app runtime.
The [delivery audit](delivery-audit-2026-10-15.md) maps both supplied reviews to
implemented work, remaining requirements and concrete acceptance outcomes.

## One operation, several callers

Native operations now have one immutable registry in `src/capabilities/registry.rs`.
Each record binds its name, description, selected domain, input contract, conservative
safety hints and internal read-agent exposure. MCP, native dispatch, Studio discovery
and agent reads consume it. Domain admission remains authoritative and is applied
before dispatch as well as during discovery. Domain handlers retain their own
object, ownership, revision and business checks.

The transport no longer owns a separate schema or visibility implementation. The
selected domain future remains boxed before polling; this preserves the coverage
worker stack repair. Registration rejects duplicate names. The initial regression
found and removed duplicate `b2b.company.create` and `b2b.settings.save` declarations.

Core tools and installed app actions share `ToolContract`. Unclassified operations
retain conservative mutating/destructive hints; these hints confer no rights.
App actions may declare `outputSchema`, using the bounded supported schema subset.
Their results are validated by the existing action gateway across HTTP, MCP and
native consumers. Omitted output contracts do not alter old immutable package
serialization. An invalid result is a non-retryable contract error: a remote write
may already have happened and is not rolled back or automatically repeated.

This is the common registry foundation. Fully derived Rust request/response
schemas, generated OpenAPI/TypeScript/WIT and static/dynamic permission metadata
for every operation are subsequent work; broad existing managed-field objects
have not magically become complete typed domain DTOs.

## Actionable failures

HTTP, MCP and agent streams share a typed safe problem description. Existing HTTP
`errors[].code` and `detail` remain compatible. Added fields include `kind`,
`status`, `retryable` and, where explicitly available, `scope`, JSON Pointer
`pointer`, or `currentRevision`. Never parse prose to infer metadata or include
SQL/provider payloads in errors. Ordinary app-record CAS conflicts report their
locked current revision. Other revision owners still need the same explicit context.

MCP distinguishes an invalid request (`-32600`), unknown protocol method (`-32601`),
unknown/unavailable tool or malformed call envelope (`-32602`) and server discovery
failure (`-32603`). Business and input-validation failures remain tool results
with `isError: true`, actionable structured errors and compatible text.
Native calls validate the same published input schema before executing. Nullable
types are actually checked; required/unknown fields report escaped JSON Pointers.
The bounded validator is a deliberately restricted schema implementation, not an
unrestricted JSON Schema engine. Raw malformed JSON still uses the HTTP extractor.

## SQL and event reliability

Quoted app field names escape embedded quotes in all builds; SQL safety no longer
depends on `debug_assert!`. Manifest admission still restricts identifiers before
schema DDL. This defense does not make arbitrary caller-supplied SQL an allowed API.

The existing outbox now leases one ready tenant per batch using persistent
least-recently-served sequence metadata. Other replicas skip its scheduling lock.
Each tenant receives at most 50 events before it rejoins the tail. A quiet shop can
advance while another still has an older backlog. The scheduler locks its own
metadata rather than the tenant root, avoiding conflicts with ordinary foreign-key
inserts. Sequence ordering survives restart and wall-clock changes.

Events, poison-event savepoints, per-event retries, quarantine, projections and
Flow/app consumers remain in the original outbox transaction. Migration 097 is
additive. Dispatch metadata has forced tenant RLS and is operational, never a
configuration release unit. Independent subscriber checkpoints are still future
work; a failed subscriber can still defer the other projections for that event.

## Remaining programme

| Area | Current evidence / next connected change |
| --- | --- |
| System database authority | Existing strict runtime rejects owner/bypass/TRUNCATE roles, but `rac.system` remains a settable authority signal. Separate restricted system/tenant connection roles and role-bound policies are still required, with a coordinated deployment. Do not call this repaired by identifier escaping. |
| Browser sessions and Studio CSP | Personal tokens still use browser session storage; Studio/storefront share a shell/policy. Move personal browser sessions to the existing session ledger through HttpOnly cookies, add CSRF/origin checks and isolate the Studio policy without breaking native shop/Experience handoffs. |
| Cryptographic separation | Inventory encryption/signing uses; introduce explicit purpose keys/key IDs and a supported decrypt/verify rotation overlap without destroying existing ciphertext. |
| Reviewed changesets | Generalize the existing proposal/apply owner to registered revision-bound operations. Keep domain previews and explicit approvals; no second proposal queue. |
| Durable agent work | Extend existing tasks/jobs with leases, checkpoints, cancellation, usage/trace and resume; do not add an in-memory authoritative runner. |
| Provider tools | Replace JSON-emulated read rounds with native tool calls and conversation history through central inference. Prompt-cache support already exists and is opt-in; source review is not proof it is enabled or economically beneficial. |
| Evals and injection | Version prompts and retain negative/source-scope/provider fixtures; add task replay/evaluations without credentials or paid provider requirements in CI. |
| Agent authority and goals | Explicit principals, current scopes, budgets, emergency stop and reviewed goal experiments; no instruction text grants new authority. |
| Proposal scope | Bind admissible objects/fields and original evidence on the server, particularly for autonomy. |
| Money | Canonical minor-unit/currency boundaries exist, but parts of persisted/catalog/calculation models remain floating point. Preserve the original-PHP differential gate before changing representation or rounding. |
| Product versus inventory revisions | Separate content CAS from inventory concurrency through existing allocation, stock, cache and claim owners; prevent stale content saves from restoring purchased stock. |
| Native events | Replace raw event-name drift with a typed/versioned catalogue and common emitter; preserve old consumers and operational replay. |
| App storage | Existing package/index/model/row/byte caps bound admission. Shared schema/storage and fleet DDL fairness still require migration and measurement; table hashing is not unlimited scalability. |
| Request consistency | Introduce bounded read units of work where needed; keep writes/locks authoritative and never hold a transaction across model/provider calls. |
| Observability | Connect safe HTTP/operation/job/inference/SQL spans and explicit exporter configuration. No customer or provider bodies in logs. |
| Module structure | Move shared domain/store/transport boundaries incrementally; immutable migration identifiers remain unchanged. |
| Extension contracts | Version typed decisions, per-operation invariants and capability declarations; see the new business-capability programme. |
| Offline app contracts | Publish a versioned complete structural Manifest schema with explicit semantic-validation limits; existing generator schemas are not a full runtime compatibility promise. |
| Agent protocols | Validate current primary specifications before implementing ACP/AP2/subscriptions. Advertise only implemented, authorized protocol capabilities. |
| Positioning | README and package metadata already identify the Sustainable Use License. Preserve that precision; do not relabel it OSI open source. |

## Verification

The source-level regression set includes native schema/nullable/pointer tests,
unique operation registration, conservative read-agent exposure and safe error
metadata. `protocols` exercises actual JSON-RPC/native validation. `app_surfaces`
checks current-revision errors and declared result rejection without leaking
configured secrets. `production_foundations` includes a slowed noisy tenant and
requires a quiet tenant to finish while noisy events remain pending.

Existing HTTP/PostgreSQL CRM, tenant-isolation, roles, POS, B2B, automation and App
Studio suites remain required. Formal policies and mutation controls are retained;
SQL scheduling, transport parsing and provider behavior remain tested adapters,
not newly proved whole-system properties. Hosted acceptance for this hardening
batch is recorded only after its release, separately from the already published
App Studio workspace UI.
