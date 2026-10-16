# App system: delivered foundations and remaining gates

**Reviewed 16 October 2026.** The integrated app builder is usable. The complete
business-capability proposal — describe an individual business model and have
Veyndo build, verify, operate and maintain it — remains an implementation programme.
This page maps that distinction; it is not a completion percentage.

The comparison uses the 15 October proposal, the hardening baseline `7a4388d`,
the deployed agent-control/message follow-ups linked from [current status](status.md),
the actual source owners below and dated release receipts. Source implementation,
local integration tests and hosted acceptance are different evidence. A later
branch, build or documentation change does not update a hosted result by itself.

## Start with what you want to do

| Need | Read next |
| --- | --- |
| Create an app visually or with agent assistance | [App Studio](app-studio.md), [workspace controls](app-studio-workspace.md), [five illustrated examples](app-tutorials/README.md) |
| Understand data, permissions and API/Flow/MCP calls | [App platform](app-platform.md), [security](app-security.md), [shared storage](app-data-storage.md) |
| Continue saved merchant-agent work | [Durable runs and their boundaries](durable-agent-runs.md) |
| Understand the full product direction | [Business capabilities](business-capabilities.md) |
| Check the latest recorded hosted release | [16 October hardening and app workflow](evidence/platform-hardening-hosted-2026-10-16.md), [Release overview](current-release.md), [16 October public acceptance](evidence/studio-release-hosted-2026-10-16.json), [15 October storage acceptance](evidence/shared-app-storage-hosted-2026-10-15.json) |

[Agent controls](agent-authority-controls.md) reuse existing keys/tasks and central inference. [Hosted stop/re-enable and checkout acceptance](evidence/agent-authority-hosted-2026-10-16.md) is recorded separately; it does not close arbitrary app execution or real-provider billing gates.

## Implemented foundations

| Capability | Actual implementation | Boundary |
| --- | --- | --- |
| One app contract | Versioned Manifest for models, native views, actions, placements, configuration, events and optional decision hooks; shared visual, API, Flow, MCP and agent consumers. | Complete typed request/response/WIT generation for every native operation remains open. |
| Visual workspace | Compact resizable toolbox, drag/reorder, actual field properties, shared Flow topology for bounded UI instructions and separate contextual assistant. | The design canvas uses sample data; F5 is the working private preview. Codex/Claude use task export/import, not automatic shell execution. |
| Multiple placements | A single app can contribute product, header, checkout, account and private Studio areas with distinct context/action allowlists. | A placement neither grants rights nor makes an unpublished app public. |
| Installed settings | Declared localized text/secret/boolean/integer settings, encrypted live values, digest/revision consent and write-only secret inputs. | Only approved private service actions receive resolved secrets; no browser, preview, release or task export receives them. |
| Fixed data storage | Four physical tables: logical models, records, lookup values and relationships; full tenant/app/model identity, signed forced RLS and composite references. | Logical row/byte/model budgets remain. Fixed table count is not evidence of unlimited throughput. Independent services retain their own explicit storage contracts. |
| Versions and private releases | Immutable package versions, current consent/digest, actor-private preview, staging and selected publication through native owners. | Package and record publication are separate selections. Code/data recovery cannot undo sent mail or payments. |
| Pure decisions | Existing WIT components receive bounded read-only snapshots and return accepted/adjustment/reason results; native money, tax, inventory and checkout validate and apply effects. | Four hooks do not constitute a generated before/after/replace contract for every commerce operation. No arbitrary WASI network/filesystem access. |
| Executable app goals | Optional `capability` v1: localized intent/assumptions and up to twelve frozen synthetic decision examples; mismatch/trap blocks save or installation. | Expected examples are not server-proven human confirmations, historical business replay or proof over every input. |
| Saved merchant planning | Existing PostgreSQL tasks/conversations, private completed model checkpoints, fenced Rust workers, current-right/evidence checks, cancellation and explicit continuation. | Bounded read rounds and one reviewed native proposal; no general durable executor for arbitrary app writes or external effects. |
| Database/browser authority | Separate restricted tenant/system pools, role-bound signed scopes, forced policies; existing HttpOnly session ledgers, exact origins and build-owned Studio scripts. Dedicated bounded planning credentials now have separate authority from ordinary integration keys. | Broader operational/security work and the Apple callback repair remain. Selected negative tests are not exhaustive security certification. |

### What “build”, “replay” and “workflow” mean today

- An immutable App Studio **build** validates and stores a Manifest. It does not
  compile arbitrary Rust/TypeScript source in a microVM.
- **Event replay** redelivers authorized saved events with original IDs. It does
  not calculate what the last thirty days of orders would have cost under new logic.
- Frozen **decision examples** execute a real component with synthetic inputs.
  They do not import customer history or establish a fleet-wide compatibility check.
- App-record **workflows** can guard their own record transitions. They do not
  add arbitrary states to native order or offer lifecycles.
- **Sandbox publication** selects reviewed changes. It is not percentage-based
  canary traffic routing with automatic KPI rollback.
- A configured independent **service** is not evidence that Veyndo built and
  provisioned a safely isolated tenant service on demand.

## Required implementation and acceptance

The requested full integration remains open until these connected outcomes work.
The B2B furniture configurator is the acceptance case across the existing owners;
its code belongs in its app package. Shared Core code owns generic admission and
invariants, not the app's material or furniture business rules.

| Gate | Current gap | Required outcome before calling it complete |
| --- | --- | --- |
| B2B configurator | [The connected app-owned implementation](furniture-configurator.md) joins materials, structured dimensions, frozen surcharge cases, native independent purchasing approval, saved inputs and current-rule reorder. The [16 October hosted receipt](evidence/platform-hardening-hosted-2026-10-16.md) also covers the builder, private material write, selected publication and a B2C configured purchase. Independent B2B approval/reorder remain locally accepted; the [purchase-summary follow-up](evidence/configuration-summary-hosted-2026-10-16.md) is separately deployed and visible in checkout, confirmation and merchant order. | Material library → validated dimensions → traceable surcharge → exact-cart independent approval → native order → saved configuration → authorized reorder; later rule changes show their actual consequences and preserve original order snapshots. |
| Core entity extensions | Native references and contextual app views exist. | Namespaced Product/Customer/Order/Company fields share schema/version/current rights across grids, filters/search, API, MCP, supported UCP and knowledge projections; no direct app SQL or cross-tenant/PII leakage. |
| Native lifecycle extensions | Existing app-record lifecycles and native transitions remain separate. | Reviewed declared order/offer states and transitions, pure guards, version-bound running objects and immutable traces; native payment, stock and refund invariants cannot be waived. |
| Historical business replay | Synthetic component cases and operational event replay exist. | Admitted revision-bound real inputs repeat without mail/payment/order effects; actual money/decision/conflict diffs identify inputs, package digest and uncertainty. |
| Isolated source builds | Manifest admission and component validation exist. | Supported Rust/TypeScript source → real isolated build without production secrets → validated immutable artifact → actual runtime consumer; bounded resources, malicious input/egress cases and cleanup verified. |
| Managed services | Approved independent services have guarded egress, jobs and secrets. | Platform-owned isolated execution, current capability admission, leases, monitoring, costs, restart and uncertain-effect reconciliation. |
| Commerce Crater | Package-owned frozen cases execute on admission/install. | A Core candidate executes supported app/version cases and authorized tenant replay corpora, detects incompatibility and creates a reviewed repair; report the actual evaluated population. |
| Shopware porting | Selected native behavior ports and original PHP comparison fixtures exist. | Inventory a real supported extension, port its intent and compare the actual scenarios against the original; unsupported API/Twig/plugin behavior remains explicit. |
| Enterprise cells | Cell/relocation architecture and worker roles are documented. | Real provisioning, isolation, update, backup/restore and fenced tenant movement; measured workload/fairness and one authoritative writer. No tenant Core fork. |
| Complete business-capability release | Existing app versions and selected publication exist. | Data/UI/decision/migration changes remain coordinated, old carts/orders have defined behavior, and measured canary routing/rollback respects irreversible effects. |

## Source and evidence map

| Responsibility | Existing source owner | Evidence / guide |
| --- | --- | --- |
| Canonical contract and example checks | `src/apps/manifest.rs`, `business_capability/`, `commerce_hooks.rs`; `src/developer/builds.rs` | [Business goals and exact test boundary](business-capabilities.md#executable-first-slice) |
| Shared storage | `src/apps/records.rs`, `record_*`, `storage.rs`; migrations 101–102 | [Migration, invariants and hosted counts](app-data-storage.md) |
| Studio / installed settings | `frontend/src/admin/developer/`, `frontend/src/admin/apps/`; `src/apps/settings.rs` | [Illustrated controls and actual configuration admission](app-studio-workspace.md) |
| Pricing and order truth | `src/apps/cart_contributions.rs`, `commerce_hooks.rs`, `src/commerce/`, `src/order_checkout.rs` | [Checkout](checkout.md), [app components](app-platform.md#pure-commerce-components) |
| B2B buying | `src/b2b/`, existing account and Studio consumers | [Company purchasing and explicit remaining scope](b2b-commerce.md) |
| Saved agent work | `src/agent_runs/`, existing tasks/conversations and central inference | [Worker-kill/provider-fixture and hosted reload acceptance](durable-agent-runs.md) |
| Security | `src/database_scope.rs`, `src/database_scope/provision.rs`, `src/scoped_pool.rs`, native auth and session owners | [Hosted enforced database receipt](evidence/database-enforcement-2026-10-15.json), [browser release](evidence/browser-release-2026-10-15.json) |

The 15 October shared-storage cutover retired eight verified legacy app tables.
After new installations the hosted audit still found four fixed forced-RLS tables,
with 27 packages, 12 logical models, five records, fourteen lookup rows and two
references. These are that audit's counts, not live counters or a capacity estimate.
The same release receipt records new SaaS/Experience and existing Storyfront
simulated purchases, embedded confirmation/bag clearing and selected app-page
publication. It does not establish real settlement, inbox delivery, issuer setup,
completed restore, large-tenant throughput or every feature's correctness.

Earlier receipts keep their original results, including a blocked embedded-browser
check in the PR 135 release. The later shared-storage receipt records a separate
successful embedded purchase on its later tree. Neither is relabeled as a new test.
Follow-up authentication/localization branches need their own merge, deployment and
acceptance; their presence in a working tree is not public availability.

## Keep this map current

Update this page, the owning guide, README/changelog and relevant public navigation
when behavior changes. Name the actual runtime consumer and evidence environment.
Retain dated receipts and mark supersession explicitly. Regenerate/check the full
Markdown publication with [the handbook workflow](documentation-site.md#build-and-validate).
Do not mark a gate complete from a form, stub, source file, green unrelated test or
configured infrastructure alone.
