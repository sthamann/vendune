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

This is the common registry foundation. The compiled registry now generates request OpenAPI, TypeScript and WIT
contracts, with drift checks in CI. These describe the bounded published input
schema; broad managed-field objects and complete response DTOs still require
domain typing. Generation is not evidence that every response is already typed.

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
Native rich-document inputs use a separate bounded depth/node profile inside that
same validator; the 64 KiB envelope cap and domain validation remain in force.
App actions retain their narrower original budgets. The validator is a restricted
schema implementation, not an
unrestricted JSON Schema engine. Raw malformed JSON still uses the HTTP extractor.

## SQL and event reliability

App storage uses fixed SQL tables and bound record values. Manifest admission
restricts logical model/field identifiers; installation and schema upgrades no
longer interpolate app-defined tables or issue DDL. Declared equality lookups use
the fixed projection indexes. This defense does not make arbitrary caller-supplied
SQL an allowed API. See [the shared storage contract](app-data-storage.md).

The existing outbox now leases one ready tenant per batch using persistent
least-recently-served sequence metadata. Other replicas skip its scheduling lock.
Each tenant receives at most 50 events before it rejoins the tail. A quiet shop can
advance while another still has an older backlog. The scheduler locks its own
metadata rather than the tenant root, avoiding conflicts with ordinary foreign-key
inserts. Sequence ordering survives restart and wall-clock changes.

Events, poison-event savepoints, per-event retries, quarantine, projections and
Flow/app consumers remain in the original outbox transaction. Migration 097 is
additive. Dispatch metadata has forced tenant RLS and is operational, never a
configuration release unit. Migration 103 adds independent cognition/apps/flows/audit schedules. Each
subscriber acknowledges the original event using its own bit; sequence high
watermarks are diagnostic because IDs are not commit order. Schedules are created with the tenant, so checkout never waits on the scheduling
row while a consumer waits on product locks. Retry and quarantine
are scoped to the event and subscriber, allowing later healthy events and other
subscribers to progress. Authorized retry resets only the original quarantined
delivery. SQL tests cover late commits, deferred legacy events, failed consumers,
restart, two replicas and actual signed tenant/system logins. The public cutover
requires the migration-only job before the new runtime starts; these source
changes alone do not establish that the migration has run online.

## Remaining programme

| Area | Current evidence / next connected change |
| --- | --- |
| System database authority | Production enforced on 15 October through PR 135: separate restricted tenant/system logins, role-bound scopes, restrictive policies and strict startup. [Hosted status and boundaries](evidence/database-enforcement-2026-10-15.json); purpose-key separation remains open. |
| Browser sessions and Studio CSP | Published through PR 134 after migration 099: [existing session ledgers](browser-sessions.md), HttpOnly cookies, exact origins, per-tab fences, customer generation checks and build-only credential-origin CSP. Public Studio reads/reload, native simulated checkout and original Storyfront embedded checkout/bag-clear passed; see the [release receipt](evidence/browser-release-2026-10-15.json). |
| Cryptographic separation | Inventory encryption/signing uses; introduce explicit purpose keys/key IDs and a supported decrypt/verify rotation overlap without destroying existing ciphertext. |
| Reviewed changesets | Generalize the existing proposal/apply owner to registered revision-bound operations. Keep domain previews and explicit approvals; no second proposal queue. |
| Durable agent work | Published through PR 135: existing tasks/conversations, private completed model checkpoints, fenced leases, cancellation and explicit continuation. [Actual worker/reload acceptance](durable-agent-runs.md). General app-effect continuation, token/spend accounting and broader traces remain open. |
| Provider tools | Native read tools and private continuation support OpenAI Responses/Chat, Anthropic and Ollama through central inference. Exact aliases and current authorization are checked before dispatch; local protocol fixtures passed. Real-provider quality and economics need separate acceptance. |
| Evals and injection | Four central prompts are versioned files with prompt ID, template digest and rendered digest in usage evidence. Injection/source-scope fixtures use the actual parser and admission. Historical whole-business replay and semantic model quality remain separate work. |
| Agent authority and goals | Explicit principals, current scopes, budgets, emergency stop and reviewed goal experiments; no instruction text grants new authority. |
| Proposal scope | Bind admissible objects/fields and original evidence on the server, particularly for autonomy. |
| Money | Canonical minor-unit/currency boundaries exist, but parts of persisted/catalog/calculation models remain floating point. Preserve the original-PHP differential gate before changing representation or rounding. |
| Product versus inventory revisions | Native product editing now supports a separate content clock and omission of untouched stock; explicit quantities retain aggregate CAS. Two-replica checkout/cancellation/MCP and UI regressions cover the path. Other operation-specific conservative aggregate checks remain. See [product concurrency](product-management.md#editing-while-orders-arrive). |
| Native events | Replace raw event-name drift with a typed/versioned catalogue and common emitter; preserve old consumers and operational replay. |
| App storage | Fixed shared models/records/index/reference tables remove per-installation DDL growth. Package/model/row/byte caps remain; throughput and fleet capacity still need measurement. Coordinated existing-data cutover is required; see [storage](app-data-storage.md). |
| Request consistency | Introduce bounded read units of work where needed; keep writes/locks authoritative and never hold a transaction across model/provider calls. |
| Observability | Safe correlation IDs connect HTTP, tasks, SQL and outbox delivery. Exporter operation and fleet-level diagnostics still need operational acceptance. No customer or provider bodies in logs. |
| Module structure | Real Cargo libraries enforce kernel, runtime, commerce, apps and cognition-provider boundaries. Native HTTP/domain composition remains in the root; dependency-DAG checks reject reverse imports. Migration identifiers remain immutable. |
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
not newly proved whole-system properties. The [16 October hosted receipt](evidence/platform-hardening-hosted-2026-10-16.md)
records the actual image, snapshot, migration 103 and public browser journeys. It
preserves the remaining CI/provider/feature acceptance boundaries separately.
