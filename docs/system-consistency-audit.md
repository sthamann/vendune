# System consistency audit — 14 October 2026

**Verdict: the common commerce foundation is connected, but the whole product is
not uniformly complete.** This audit reproduced and repaired two executable
permission/transport defects. Retained-history, original Storyfront, automation
and deployment boundaries remain incomplete.

The public review began at `a9256ce`; the subsequent `cb17179` change concerns
order-workflow CSS, not these domain contracts. Private Experience was reviewed
at `2a96fbb`. Source inspection, isolated execution and earlier hosted acceptance
are separate evidence. This is not an exhaustive proof of every module.

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

## Integration matrix

“Connected” means the named native paths share authority and have executable
evidence. It does not mean every source class, external app or renderer feature
has been ported or accepted in production.

| Property | Connected implementation | Remaining boundary |
| --- | --- | --- |
| Rust/runtime | Commerce, hosted MCP, PDF extraction and bundled connector/provider services run in Rust. Core/connector runtime images contain no Python installation or entry point. | Browser and private Experience/original Storyfront use TypeScript/Bun/Astro. Private identity/welcome mail has its existing TypeScript owner. Python remains tools/CI/migration and independent examples. The entire platform is not Rust. |
| API/MCP | Native dispatch reaches existing domain handlers; protected HTTP methods register explicit rights. Approved app contracts own dynamic routes/actions. | Route metadata and MCP schemas are maintained separately; the static catalog is not typed generated OpenAPI. Auth/binary transports and some metadata operations have no one-to-one MCP command. The automation defect above is repaired. |
| Rights/roles | Tenant-defined roles, current membership projection, current sessions/keys/callbacks/workers, explicit PII and effective-permission UI gates. | Legacy aliases remain: settings writing also grants channel/automation/AI management; catalog writing also grants knowledge writing. Original Storyfront admission is owner-based, not generic Core staff-role admission. |
| Tenant isolation | Server-derived context, forced Core/app RLS, tenant-aware foreign keys and current admission. Exercised foreign IDs cannot mutate victim state. | The repaired stage diff defect was a same-tenant cross-domain leak. Passing tested denials is not certification of every endpoint, hosting credential or upstream component. Channels are contexts within a tenant. |
| History/versioning | Core entity snapshots retain actor/source/before/after; restore validates a new revision. Orders/documents/payment effects remain protected. App packages/builds and schema-recovery snapshots retain versions. | CAS is not retained content history. App records currently retain the latest row and a minimized change event, not universal per-edit before/after/actor history. Native experience policy and order-state-machine configuration are absent from the shared history API. |
| Sandbox/release | Private clone, filtered diffs, current domain rights, exact digests, baseline/live conflicts and atomic selected publication. Operational customer/order/payment/stock/credential and B2B state is excluded. | No generic release rollback, automatic conflict merge, product deletion or destructive schema release. App snapshots cap each entity at 1,000 rows. Service executable deployment and original Storyfront scene/publication state are outside Core's selected-release transaction. |
| Rules/flows | Shared native facts/conditions, current action rights, outbox/leases, per-step receipts, delays, app actions/events and proposal-only AI steps. POS/B2B/source/consent events join ordinary commerce. | 108/114 bindings and 432 compared cases across 74 original conditions do not prove full Shopware parity. Six conditions remain disabled; full triggers/interchange/script runtime and all cross-flow recursion controls are incomplete. |
| Apps | One Manifest/AST for agents and visual editing, digest/consent, references, slots, API aliases, MCP selection, events/jobs, bounded Wasm and separate services. Implementation stays app-owned. | F5, staging, Wasm and network services have different containment boundaries. Selective package publication accepts declarative runtimes; external services need a separate build/deployment. Folder ownership does not prove arbitrary hostile native code is contained. |
| AI | Native retrieval/review, permission-checked read rounds, revision-bound proposals, explicit apply, price corridors and quotas. Native owners perform effects. | Generic proposals for every operation and recurring autonomous goals are incomplete. Original Storyfront workers still need their own provider configuration; universal Core model inheritance is not connected. |
| Knowledge graph | PostgreSQL evidence/commerce remain authoritative; Qdrant is rebuildable. Native app ontology and consent-bound visitor projections feed authorized API/MCP/planner reads. | No universal extraction from every return/review/support event, global semantic traversal or authenticated cross-device preference graph. Original generated/edited prose is not universally bound to Core claims. Fixtures do not prove model quality. |
| Shops/channels | Independent shops are tenant boundaries; channels reuse commerce with sparse company/checkout overrides. Pause/private admission reaches API/MCP/proxies. | Native Storyfront keeps its imported channel binding. Moving/reusing it across channels and native preview forwarding remain incomplete. Aliases do not create an isolated catalog. |
| Languages | Core/bundled controls have EN/DE/FR/ES gates; content supports enabled locales, one selected-language editor, main/regional fallback and explicit empty values. | A fifth interface language needs registry/catalog changes; enabling content locales does not translate controls. Original Storyfront editors still contain English. Remote apps/generated prose need their own checks. |
| Countries/taxes/currency | Geography overlays/search, explicit destination coverage and rule-based tax context. Channel currencies and fixed/FX prices reach native quotes/orders/API/MCP. | Geography is not tax-law automation/legal completeness. Historical calculators retain differential-tested float behavior internally; exact payment/order boundaries do not mean every operation is decimal/integer. |
| Operations | Outbox invalidation, current access rechecks, durable leases/admission, operator metrics and controlled backup→migration→deployment. | CoW staging, generated OpenAPI, broader OTEL, measured sharding/failover and full backup/key/provider recovery exercises remain separate. Fiscal POS hardware and real payment/EDI/marketplace acceptance are not established by fixtures. |

## Intentional differences

- Orders, captures, stock consumption, employee grants, RFQs and spending must not
  be copied back from staging or rewound by configuration restore. Use their state machines.
- Provider apps reuse scoped callbacks/jobs/receipts and commerce, not another ledger.
- Original Storyfront presentation publication is currently distinct from Core release.
- Content languages, bundled UI and remote app UI are distinct maintenance scopes.

## Verification

The existing isolated runner passed thirteen selected suites: `workspace_roles`,
`staging`, `automation_lifecycle`, `crm_history`, `tenant_isolation`,
`international_commerce`, `currencies`, `app_ontology`, `app_preview`, `app_events`,
`production_foundations`, `channel_management` and `behavior_intelligence`.
Those tests were green even though the new counterexamples reproduced defects.

The repairs were rerun through seven affected suites. New checks live in
`scripts/testing/consistency_boundaries.py`, called by the existing role suite,
using real HTTP/MCP/PostgreSQL and narrow grant subsets. Rust tests/format/Clippy,
source/route inventory, existing Lean/conformance/mutation gates and private
Experience's 230 tests complement them. [Measured scope](testing.md).

No real customer dataset, paid inference, external mail, payment or seller API was
used. This is not a fresh public end-to-end test of all hosted shops. The patch
requires protected merge and hosted release before it is publicly active.

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
