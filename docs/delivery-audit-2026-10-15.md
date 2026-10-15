# Delivery audit — 15 October 2026

This audit reconciles the two supplied source reviews with the actual repository,
GitHub verification and hosted Studio. It is an implementation checklist, not a
statement that all roadmap items are complete.

**Published baseline:** `3034beb`, PRs [128](https://github.com/sthamann/veyndo/pull/128)
and [129](https://github.com/sthamann/veyndo/pull/129). The exact baseline's
[verification run](https://github.com/sthamann/veyndo/actions/runs/38706601225)
passed the registered integration suites, frontend tests, Rust tests and existing
partial formal gates. Passing these checks proves neither production capacity nor
completion of the proposed architecture.

**Current hardening branch:** operation registration, structured errors, bounded
schemas, optional app output contracts, release-safe identifier quoting and fair
outbox scheduling. These changes are not part of the published baseline until
their own review, checks and release complete.

## Recent product requests

| Request | Verified state | Remaining acceptance |
| --- | --- | --- |
| Compact illustrated App Studio toolbox | Published; live Studio shows 180 px resizable toolbox and graphical controls. | No claim that every third-party app UI has been visually accepted. |
| Separate contextual assistant | Published; live open/close retains the selected app canvas. | Codex/Claude use task export/import, not automatic local-shell execution. |
| Drag/reorder and editable form model | Published shared designer and model bindings; covered by frontend and app-preview suites. | Designer sample fields are not real records; F5 is the actual authorized runtime. |
| Multiple app placements | Published compiler and registry include product, global header, checkout, account and private administration. | Each placement retains its own context and current action rights. |
| Installed app configuration | Published declared settings and encrypted live-only values; CI checks redaction, digest/revision and scope boundaries. | Native UI does not receive secret values; service provisioning remains explicit. |
| API layout, grouped rights, permanent keys | Published layout/shared permission picker; native permanent-key admission and revocation checked in CI. | Permanent keys require a current personal administrator; no new live key was created during this audit. |
| Standard shop visual editor | Published; live preview now displays the actual shop, products and desktop/tablet/mobile controls. | A shop still explicitly reviews/installs design packages and uses private staging for changes. |
| Marketplace/channel/Storyfront setup | Published native channel workflow and private Experience handoff. | A configured contract is not live seller certification or proof of every external Storyfront generation. |
| Documentation and website | Baseline documentation publication succeeded. | New hardening and capability documentation must ship with the corresponding release. |

## Source review: AI and operation consistency

| Item | State and owner | Next decisive acceptance |
| --- | --- | --- |
| One operation registry | Implemented in this branch: `capabilities/registry.rs` binds input, owner, discovery and read-agent exposure. | Registered HTTP/MCP/role regressions pass without widening domain rights. |
| Typed native DTOs and generated OpenAPI/TS/WIT | Open; current registry still consumes existing domain schemas. | Generate from actual typed request/response owners, including semantic validation boundaries. |
| Shared Core/app tools | Common wire contract and optional checked app outputs implemented in this branch. | Native operation outputs and complete effect/idempotency/PII metadata remain to be typed. |
| Native MCP input validation | Implemented in this branch, including nullable unions and escaped field pointers. | Unknown or malformed calls cannot mutate state; existing legitimate calls remain compatible. |
| Structured errors | Implemented in this branch; app-record CAS exposes its locked revision. | Extend explicit revision/scope context to other native owners without parsing prose. |
| Generic revision-bound changesets | Open; existing proposals support a fixed set of changes. | Domain previews, pinned input revisions, one reviewed release/apply path and atomicity appropriate to the domain. |
| Native provider tool calls | Open; current read rounds use structured JSON. | Actual OpenAI/Anthropic/Ollama conversation adapters, authorized tools and provider-fixture parity. |
| Prompt caching | Existing opt-in support; not a newly implemented feature. | Verify deployment configuration and actual usage before claiming token/cost savings. |
| Durable agent runs | Open beyond existing tasks/jobs. | Persist checkpoints, cancellation, leases, usage and restart-safe continuation through the existing owner. |
| Evals and prompt versions | Local provider fixtures exist; broader task/injection corpus open. | Prompt identity in evidence, adversarial scope cases and explicit optional real-provider tests. |
| ACP/AP2/subscriptions | Open; do not advertise from roadmap prose. | Verify current primary specifications, implement supported subset and real denied-access cases. |
| JSON-LD | Requires an explicit current storefront audit. | Validate rendered product/offer facts and current public/channel/currency admission. |
| Agent principals and budgets | Open beyond current user-bound authority and quotas. | Revocable explicit identity, current scopes, spend/token limits and emergency stop. |
| Goal/experiment loop | Existing controlled experiments; complete goal lifecycle open. | A reviewed goal produces a traceable hypothesis, experiment, decision and measured outcome. |
| Server-bound proposal scope | Partial; domain rights and CAS already apply. | Object/field/evidence allowlists cannot be widened by retrieved or model-authored content. |

## Data, reliability and security

| Item | State and owner | Next decisive acceptance |
| --- | --- | --- |
| Exact money throughout storage/calculation | Open; exact boundaries exist but product/calculation floats remain. | Pass the original-PHP differential gate before changing representation or rounding. |
| Separate product/content and inventory revisions | Open. | Concurrent purchase cannot make a harmless content edit fail or let a stale edit restore stock. |
| Typed/versioned native event catalogue | Open; existing event producers/consumers remain authoritative. | Producer/consumer parity, old-event compatibility and one registered emitter. |
| Fair tenant outbox scheduling | Implemented in this branch with additive migration 097 and scheduling-row locks. | Quiet tenant finishes while an older noisy backlog remains, across real replicas. |
| Independent subscriber checkpoints | Open. | One slow/failing projection cannot defer unrelated subscribers; no duplicate financial effects. |
| Shared app storage strategy | Open; current tables are per tenant/app/entity. | Measured schema/index growth and safe existing-data migration before fleet-capacity claims. |
| Request read units of work | Open; transaction-pool wrappers still scope individual queries. | Consistent bounded reads without holding database transactions across providers/models. |
| End-to-end traces | Open beyond existing metrics/audit. | Safe correlated HTTP → operation → SQL/job/inference traces with explicit exporter configuration. |
| Compiler-enforced crate boundaries | Incremental work open. | Preserve native API, boxed dispatch and app ownership while reducing facade coupling. |
| Released migration identifiers | Already immutable. | Never rename or renumber deployed migrations to tidy historical duplicate prefixes. |
| SQL identifier quoting | Fixed in this branch in all builds. | Invalid delimiters remain quoted; manifest admission still rejects invalid identifiers. |
| System-scope database role separation | Open. Existing restricted runtime is not owner/bypass, but `rac.system` is still a settable policy signal. | Separate restricted connections/roles and role-bound policies, coordinated deployment and real adversarial SQL checks. |
| HttpOnly browser sessions and Studio CSP | Open. Merchant tokens remain in session storage. | Existing session ledger, CSRF/origin checks, dedicated Studio policy and compatible onboarding/Experience handoffs. |
| Purpose keys and rotation | Open. | Separate signing/encryption purposes, key IDs and backwards-compatible verification/decryption overlap. |
| License/positioning | Sustainable Use License already identified. | Keep actual prototype/production boundaries; do not call the license OSI open source. |

## New business-capability concept

The proposed contract must extend the existing Manifest, not add another app store,
queue, CMS, price calculator or permission system. The frontend is a client of the
same operation owners. Existing app packages remain in `extensions/apps/<app>/`.

| Phase | Still required | Proof of completion |
| --- | --- | --- |
| Typed decisions | Versioned typed quote/checkout/order inputs, declared price phases/dependencies, approved digest artifacts and replay inputs. | Pricing/message/engraving examples repeat frozen inputs deterministically; core money/stock/auth invariants remain enforced. |
| Entity extensions | Namespaced typed Product/Customer/Order/Company extension fields. | Same schema and permissions reach native API, MCP/UCP, grids, search and graph; no direct core SQL access. |
| Change contract | Intent, assumptions, confirmed examples, dependencies, migration and fallback in the canonical Manifest. | Manual and AI edits preserve identities and existing constraints; confirmations have server-owned provenance. |
| Complete B2B case | Materials, dimensions/surcharge, approvals, account/reorder and production view. | A later rule change has a visible replay diff, preserves old orders and publishes through the existing release path. |
| Lifecycle extensions | Declarative transitions and pure guards under native invariants. | No extension can waive settlement, inventory or financial transition checks. |
| Historical replay | Authorized bounded snapshots, outcome diffs and uncertainty. | Repeat actual admitted inputs without sending mail, charging or duplicating orders. |
| Canary/rollback | Version-bound rollout and explicit effect handling. | Measured routing/rollback; reverting code never claims to reverse sent mail or payments. |
| Managed source builds | Isolated Rust/TS compilation without production secrets; digest-pinned output. | Actual source → isolated build → validated artifact → current app consumer, not just a build form. |
| Managed services | Capability-limited I/O, egress, budgets and private hosting. | Actual isolated execution, leases, observability and restart-safe ambiguous-effect handling. |
| Commerce Crater | Checked-in apps first, then authorized tenant examples/replay corpora. | A core update runs the declared cases, detects incompatibility and produces a reviewed repair. |
| Shopware migration | Supported app/API/webhook subset, script scope and original differential tests. | Port one inventoried real extension first; do not promise unchanged Symfony plugins in shared Core. |
| Enterprise cells | Placement, quotas, native extension isolation and operational ownership. | Real provisioning/update/move evidence; no per-tenant Core forks. |

Wasmtime is already version 49. A generic version upgrade is not proof of WASI
async/HTTP support or microVM isolation. Browser execution also does not grant
arbitrary third-party code access to Studio or authenticated customer capabilities.

## Scaling request retained after completion work

200,000 products per merchant and 3,000 orders/minute (50 orders/second) are target
workloads, not measured current promises. Existing bounded catalogue measurements
and worker roles are useful foundations. Automatic database placement, live tenant
moves, dedicated databases and fleet autoscaling remain open. Verification must
include app tables/assets/jobs, identities, sessions, payments, event leases,
search/cache projections and a single authoritative writer during cutover.

See [scalability](scalability.md), [hardening](platform-hardening.md) and
[business capabilities](business-capabilities.md). New hosted resources/access must
use the normal reviewed provisioning path after local acceptance.
