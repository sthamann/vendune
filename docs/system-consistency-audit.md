# System consistency audit — 14 October 2026

**Verdict: the common commerce foundation is connected, but the whole product is
not uniformly complete.** Two successive passes reproduced and repaired three
permission/transport defects. Retained-history, original Storyfront, automation
and deployment boundaries remain incomplete.

The first review began at `a9256ce`; its permission repairs merged in `74dbc19`
(PR 109). The second pass tests Core `b4fb561`, the reviewed history-discovery
patch described below, and private Experience `6563b2d` with original Storyfront
pin `2087783606e5c925317bae57625256a82c16bff0`. Source inspection, isolated
execution and hosted acceptance remain separate evidence. This is not an
exhaustive proof of every module or endpoint.

## Reproduced defects and repairs

**Knowledge source staging:** direct APIs require `knowledge.read` / `knowledge.write`,
but staging `document:*` units incorrectly used catalog rights. A synthetic catalog
reader without knowledge rights was denied direct access yet could see an edited
private source in the stage diff. Conversely, a knowledge-only editor could write
sources but could not see/publish them. `src/staging/access.rs` now uses the source
owner's knowledge scopes for both diff and publication. Regressions verify denied
reads/releases, unchanged live state, successful knowledge-only publication and actor
history. Asset/catalog permissions are unaffected.

**HTTP/MCP automation:** HTTP import registered reading while its handler required
management; MCP discovery combined unrelated channel/automation grants. Identical
input succeeded through MCP but returned HTTP 403 for a role with automation
management plus channel reading. Channel-only roles also discovered unusable rule
tools. `marketing::capability_visible` now owns exact discovery scopes, and HTTP
import uses automation management. Save/delete advertise an admitted managed domain;
their native handlers still check the actual `kind`. Write-only roles need no
unrelated read grant. Both transports deny a channel manager's rule mutation.

**History discovery:** MCP advertised restoration to a knowledge-write-only role,
although native history requires reading as well. It also advertised private
customer/order/B2B history to roles without `customers.pii`. Those invocations
already failed closed: this was misleading discovery, not a successful snapshot
leak. Discovery now uses the existing entity rights and the same PII classification
as native history. Read-only roles see reads, qualified editors see restoration,
and write-only/PII-denied roles do not see unusable history tools. The canonical
entity set also supplies the MCP schema; invocation still checks the requested
entity, current tenant and current revision.

## Integration matrix

“Connected” means the named native paths share authority and have executable
evidence. It does not mean every source class, external app or renderer feature
has been ported or accepted in production.

| Property | Connected implementation | Remaining boundary |
| --- | --- | --- |
| Rust/runtime | Commerce, hosted MCP, PDF extraction and bundled connector/provider services run in Rust. Core/connector runtime images contain no Python installation or entry point. | Browser and private Experience/original Storyfront use TypeScript/Bun/Astro. Private identity/welcome mail has its existing TypeScript owner. Python remains tools/CI/migration and independent examples. The entire platform is not Rust. |
| API/MCP | Native dispatch reaches existing domain handlers; protected HTTP methods register explicit rights. Approved app contracts own dynamic routes/actions. History discovery now enforces native read/write/PII conjunctions; grid criteria share a native schema. | Other route metadata and MCP schemas are maintained separately; the static catalog is not typed generated OpenAPI. Auth/binary transports and some metadata operations have no one-to-one MCP command. This audit does not certify every discovery conjunction. |
| Rights/roles | Tenant-defined roles, current membership projection, current sessions/keys/callbacks/workers, explicit PII and effective-permission UI gates. | Legacy aliases remain: settings writing also grants channel/automation/AI management; catalog writing also grants knowledge writing. Original Storyfront admission is owner-based, not generic Core staff-role admission. |
| Tenant isolation | Server-derived context, forced Core/app RLS, tenant-aware foreign keys and current admission. Exercised foreign IDs cannot mutate victim state. | The repaired stage diff defect was a same-tenant cross-domain leak. Passing tested denials is not certification of every endpoint, hosting credential or upstream component. Channels are contexts within a tenant. |
| History/versioning | Core entity snapshots retain actor/source/before/after; restore validates a new revision. Orders/documents/payment effects remain protected. App packages/builds and schema-recovery snapshots retain versions. | CAS is not retained content history. App records currently retain the latest row and a minimized change event, not universal per-edit before/after/actor history. Native experience policy and order-state-machine configuration are absent from the shared history API. |
| Sandbox/release | Private clone, filtered diffs, current domain rights, exact digests, baseline/live conflicts and atomic selected publication. Operational customer/order/payment/stock/credential and B2B state is excluded. | No generic release rollback, automatic conflict merge, product deletion or destructive schema release. App snapshots cap each entity at 1,000 rows. Service executable deployment and original Storyfront scene/publication state are outside Core's selected-release transaction. |
| Rules/flows | Shared native facts/conditions, current action rights, outbox/leases, per-step receipts, delays, app actions/events and proposal-only AI steps. POS/B2B/source/consent events join ordinary commerce. | 108/114 bindings and 432 compared cases across 74 original conditions do not prove full Shopware parity. Six conditions remain disabled; full triggers/interchange/script runtime and all cross-flow recursion controls are incomplete. |
| Apps | One Manifest/AST for agents and visual editing, digest/consent, references, slots, API aliases, MCP selection, events/jobs, bounded Wasm and separate services. Implementation stays app-owned. | F5, staging, Wasm and network services have different containment boundaries. Selective package publication accepts declarative runtimes; external services need a separate build/deployment. Folder ownership does not prove arbitrary hostile native code is contained. |
| AI | Native retrieval/review, permission-checked read rounds, revision-bound proposals, explicit apply, price corridors and quotas. Native owners perform effects. | Generic proposals for every operation and recurring autonomous goals are incomplete. Original Storyfront workers still need their own provider configuration; universal Core model inheritance is not connected. |
| Knowledge graph | PostgreSQL evidence/commerce remain authoritative; Qdrant is rebuildable. Native app ontology and consent-bound visitor projections feed authorized API/MCP/planner reads. | No universal extraction from every return/review/support event, global semantic traversal or authenticated cross-device preference graph. Original generated/edited prose is not universally bound to Core claims. Fixtures do not prove model quality. |
| Shops/channels | Independent shops are tenant boundaries; channels reuse commerce with sparse company/checkout overrides. Pause/private admission reaches API/MCP/proxies. | Native Storyfront keeps its imported channel binding. Moving/reusing it across channels and native preview forwarding remain incomplete. Aliases do not create an isolated catalog. |
| Languages | Core/bundled controls have EN/DE/FR/ES gates; content supports enabled locales, one selected-language editor, main/regional fallback and explicit empty values. The native Storyfront shell/overview have source-owned four-language vocabulary. | A fifth interface language needs registry/catalog changes; enabling content locales does not translate controls. Other original Storyfront editors still contain English. Remote apps/generated prose need their own checks. |
| Countries/taxes/currency | Geography overlays/search, explicit destination coverage and rule-based tax context. Channel currencies and fixed/FX prices reach native quotes/orders/API/MCP. | Geography is not tax-law automation/legal completeness. Historical calculators retain differential-tested float behavior internally; exact payment/order boundaries do not mean every operation is decimal/integer. |
| Operations | Outbox invalidation, current access rechecks, durable leases/admission, operator metrics and controlled backup→migration→deployment. | CoW staging, generated OpenAPI, broader OTEL, measured sharding/failover and full backup/key/provider recovery exercises remain separate. Fiscal POS hardware and real payment/EDI/marketplace acceptance are not established by fixtures. |

## Component status at the second pass

The rows below name the actual connected owner and the kind of evidence, rather
than treating the presence of a menu, counter or schema as implemented behavior.
“Local path passed” refers to existing isolated HTTP/PostgreSQL suites with native
effects and local provider protocols. It is not a new public end-to-end test.

| Component | Authority and connected consumers | Current evidence and completeness boundary |
| --- | --- | --- |
| Catalog, categories, variants and media | Native `commerce`, `categories`, `assets` and translation owners; Studio/storefront, HTTP/MCP and installed product slots share them. | Catalog/customer/list and asset suites pass. Four-language controls and a fifth content language have checks. This is not full Shopware DAL/CMS/plugin compatibility. |
| Cart, checkout, prices, stock and accounts | Native cart/calculation/checkout, currency, inventory and account owners; ordinary frontend, POS and hosted checkout delegate to them. | Reviewed/stale/foreign cart, embedded origins, German variant labels, exact currency boundaries and immutable orders pass. Original PHP-compatible floating-point calculation remains inside the documented slice. |
| Orders, deliveries and documents | Native order state machine, allocations, booking intents and immutable document owner; events reach Flow and provider apps. | Replay, split, unknown booking recovery, PDFs and current rights pass. Generic shipping deliberately selects no carrier. Real carrier, fiscal printer and terminal acceptance remain separate. |
| Customers and B2B | Native CRM/accounts/groups and B2B company/unit/catalog/budget/approval/quote owners; Studio, HTTP/MCP and selected UCP negotiation share them. | Current staff/buyer permissions, quote/approval separation, company setup and foreign denial pass. Quotes/spending/employee grants remain operational and cannot be published from staging. Full EDI partner profiles and every B2B product feature are not claimed. |
| Rules, promotions and Flow | `marketing` facts/configuration/pipeline, PostgreSQL outbox and app actions; shared current actor admission. | Native event-to-action, settings/package races, delay/replay and standard provider paths pass. Original-source condition coverage remains 108/114 bindings; unsupported original conditions/triggers stay disclosed. |
| History and selected publication | Existing `history` snapshots and `staging` diff/release transaction; domain validators own restores. | Narrow roles, source rights, digest/CAS conflicts, history actor and operational exclusions pass. App record edit history and native presentation/workflow configuration are not universally covered. A release receipt is not a universal rollback mechanism. |
| App Studio, packages and runtimes | One Manifest/AST, native app records/consent/schema/references/slots/secrets/jobs/events and private F5 preview; app files remain under their package. | Consent, migrations/recovery, preview, current callbacks, schemas, ontology, exports/distribution, agent generation and events pass. Layout grids preserve installed action/filter contracts. External service builds and hostile arbitrary code containment remain deployment responsibilities. |
| Payments | Generic native attempts/jobs/reservations and versioned app provider contract; public host does not own private provider implementation. | Local onboarding, authorize/capture/reconcile/void/refund, currencies and signed callbacks pass. Real Shopware Payments requires its private service and authorized provider configuration; local protocols are not live settlement evidence. |
| Email, Analytics, Gmail and Slack | App-owned Rust implementations hosted by the shared Rust connector; scoped gateway and PostgreSQL queues/outbox. | Actual local SMTP/provider wires, OAuth, uncertainty, leases, events, revocation and private retrieval projection pass. Private Experience identity/welcome mail retains its separate TypeScript owner. No live message/account test was run. |
| Intelligence and knowledge | Native cognition/knowledge, approved source/claim compiler, central inference and rebuildable retrieval projections. App ontology/visitor reports use admitted native state. | Source/review/publication and consent-bound visitor paths pass; strict OpenAI grid proposals cross the actual provider wire and a native restart. This second local run did not exercise fresh Qdrant dense retrieval. Fixtures establish contracts, not model semantic quality or commerce uplift. |
| Hosted shops and Storyfront | Core tenant/domain/channel/mount authority; private Experience adapter and pinned original Storyfront presentation service. | Native channel/privacy/domain/handoff suites and private Experience checks pass. The original editor remains the single presentation owner. Staff-role equivalence, Core provider inheritance and coordinated presentation/configuration publication remain incomplete. |
| International settings and legal controls | Shared geography, native destination/tax rules, currency and legal configuration; channel overrides, checkout/API/MCP reuse them. | Country/region selection, localized methods, FX/fixed quotes, configuration history and privacy receipts pass. Countries are not automatically lawful destinations; tax, sector/fiscal and provider compliance still require configuration and real acceptance. |
| Operations, platform and performance | Native auth/RLS, resource admission, outbox/cache invalidation and platform metrics; protected deployment retains backup/migration/readiness. | Warmed two-replica invalidation, cold restart, pool exhaustion/recovery, current grants and dedicated non-owner foundation tests pass. This is not production-scale throughput, failover or a complete restore drill. |

## What “versioned” and “sandboxed” mean here

| Object class | Version behavior | Sandbox/publication behavior |
| --- | --- | --- |
| Supported Core configuration/content | CAS plus retained snapshots and validated restoration as a new revision. Exact entities are listed by `history::rights`. | Supported selected changes are checked against the live baseline and published atomically with their domain rights. |
| App packages and schema migrations | Immutable package versions, reviewed migration contract and schema-recovery snapshots. | Declarative package/configuration/data selection uses the existing admitted release path; external binaries have their own deployment. |
| Ordinary app records | Current revision and minimized events; universal retained per-edit snapshots are absent. | Private preview/staging and bounded record selection exist, but they do not add a missing record-history ledger. |
| Orders, captures, reservations, invoices, quotes and spending | Operational transitions and immutable receipts; selected histories are read-only. | Never copied back or rewound as configuration. Use current native state-machine operations. |
| Credentials, sessions and memberships | Current identity/revocation and dedicated security lifecycle. | Not sandbox release payloads or ordinary history restores. |
| Original Storyfront scenes/design/publication | Original private presentation owner and its versions/CAS. | Not part of Core's single selected-release transaction; imported native channel binding is retained. |

## Intentional differences

- Orders, captures, stock consumption, employee grants, RFQs and spending must not
  be copied back from staging or rewound by configuration restore. Use their state machines.
- Provider apps reuse scoped callbacks/jobs/receipts and commerce, not another ledger.
- Original Storyfront presentation publication is currently distinct from Core release.
- Content languages, bundled UI and remote app UI are distinct maintenance scopes.

## Verification

The first pass's existing isolated runner passed thirteen selected suites: `workspace_roles`,
`staging`, `automation_lifecycle`, `crm_history`, `tenant_isolation`,
`international_commerce`, `currencies`, `app_ontology`, `app_preview`, `app_events`,
`production_foundations`, `channel_management` and `behavior_intelligence`.
Those tests were green even though the new counterexamples reproduced defects.

The repairs were rerun through seven affected suites. New checks live in
`scripts/testing/consistency_boundaries.py`, called by the existing role suite,
using real HTTP/MCP/PostgreSQL and narrow grant subsets. Rust tests/format/Clippy,
source/route inventory, existing Lean/conformance/mutation gates and private
Experience's 230 tests complement them. [Measured scope](testing.md).

The second pass completed **49 registered suites** at `b4fb561`: roles/security,
staging/automation/history/isolation, international commerce/currency/company
settings, source knowledge, POS/B2B/UCP/legal, delivery/payment protocols,
app consent/references/schema/jobs/components/assets/callbacks/Studio/ontology,
checkout transfer/review, native directories, app events, production foundations,
marketplaces/EDI/ERP/shipping, connected apps/Rust connectors/email,
secrets/export/distribution/generation and read-performance paths. The new
history-discovery counterexample then failed on that otherwise passing code.
The repaired roles/history/isolation suites pass separately, including direct
denials and successful discovery/invocation for the qualified editor. Current Rust
format, all-target Clippy and **243 tests** pass; the private `6563b2d` complete
check passes **230 tests**, translation/structure/type checks and its actual build.
The private build still warns about its 562 kB minified entry chunk: full initial
bundle splitting is not completed by these checks.
The refreshed site validates **211 pages**, all **204 Markdown sources** and
**5,036 local links/assets**. The same source is rendered for GitHub Pages;
a local build alone is not evidence of its public deployment.

Two operational evidence limits matter: the general isolation suite uses a
synthetic database owner and reports `coreRls: false`; the separate production
foundation suite exercises strict non-owner RLS. Deployment must explicitly
enable `DB_RLS_REQUIRED=true` with a separate runtime connection; a passing
owner-backed API suite is not evidence of this hosting configuration. `/health`
probes PostgreSQL and reports descriptive model/knowledge/payment fields. It does
not probe Qdrant or every provider, and its fixed `payment: simulated` field is
not per-shop provider readiness. Inspect the existing authorized provider/index
status owners for those facts.

The original public anonymous probe reached `/health` (200) and the unauthorized
platform overview (401), but its empty registration body returned non-JSON 403
and 422 responses. Source inspection establishes that `Register` deserialization
runs before the closed-signup policy. The corrected probe supplies that DTO
shape with an intentionally invalid email and empty password: it reaches the
closed-signup policy, but cannot create an account if signup is open because
email validation precedes hashing/writes. The refreshed public probe passes
health 200, unauthorized platform 401 and closed direct registration 403.
Non-JSON/wrong-status replies still fail with bounded diagnostics; they never
become a successful application-gate claim. Fifteen tooling tests include those
negative cases. This is not browser-Origin or authenticated onboarding acceptance.

Bad typed HTTP bodies may still produce Axum's plain-text 422 before native
JSON errors; uniform extraction-error envelopes are not implemented by this
diagnostic repair and remain an API consistency boundary.

No real customer dataset, paid inference, external mail, payment or seller API was
used. This is not a fresh public end-to-end test of all hosted shops. PR 109's
repair was verified running on the hosted Core. The newer history-discovery repair
requires its own protected merge and hosted release before it is publicly active.

## Next closure work

1. Extend the retained-history owner to app records, native experience policy and
   workflow configuration, with validated restores and operational exclusions.
2. Make legacy implied grants explicit in role editing; migrate existing grants
   deliberately before removing compatibility.
3. Bridge original Storyfront staff admission, provider inheritance and presentation
   versions/preview/publication into existing contracts, preserving its original editor.
4. Generate transport contracts from owning schemas; add narrow-grant parity cases
   for every domain and required-permission conjunction.
5. Complete the disclosed Flow/AI/localization scope at its owners with actual consumers.

Related: [connected features](feature-integration.md), [architecture](production-architecture.md),
[apps](app-platform.md), [workbench](workbench.md), [automation](automation.md),
[cognition](cognitive-commerce.md), [localization](localization.md) and
[international commerce](international-commerce.md).
