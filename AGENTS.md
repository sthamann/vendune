# Changes to Veyndo

Prefer the codebase-memory MCP graph for structural code discovery. Keep Rust
modules small and give every source file a responsibility comment; the existing
structure check is mandatory.

## Understand the existing architecture before extending it

Read [the source map](docs/source-map.md) for module ownership and
[Rust services and language boundaries](docs/rust-services.md) for the actual
service, queue and migration contracts. Follow the existing call path from the
frontend/API/MCP/flow entry point to its production consumer before changing it.
These documents describe one connected system, not alternative implementations.

| Existing owner | Responsibility / entry points |
| --- | --- |
| Rust commerce binary | `src/main.rs` is process entry only; domain modules own commerce operations. Store/Admin APIs, MCP and implemented UCP routes reuse those operations, permissions and tenant checks. |
| Rust connector binary | `src/bin/connectors.rs` and `extensions/services/connectors/src/` own shared hosting; provider implementation belongs to the respective `extensions/apps/<app>/` package. This is a separate service reached through the permission-aware app gateway, not provider code embedded in checkout. |
| Frontend | `frontend/src/` contains modular Studio/storefront clients of the existing APIs. Keep provider credentials and privileged gateway tokens server-side. |
| Durable state and events | PostgreSQL owns commerce state, connector configuration and queues. Commerce outbox/Flow Builder events reach the connector through the existing app action/event contract. Qdrant supplies knowledge vector retrieval, not a second commerce ledger. |
| External extensions | The language-neutral app gateway and documented extension contracts support independent services. Private Payments and Storyfront/Experience implementations stay in their separate repositories. |

Do not create a parallel mailer, queue, settings store, pricing engine, provider
registry, MCP command implementation or commerce API to avoid understanding an
existing module. Extend its owner and shared contract. For example, order email
delivery follows **Rust checkout → PostgreSQL outbox → Flow Builder → app gateway
→ Rust connector → PostgreSQL delivery queue → provider**. Preserve its tenant
identity, permissions, idempotency, quotas, lease fences and uncertainty handling;
do not add direct SMTP calls to checkout or a Python fallback worker.

Money/currency resolution already belongs to `src/currencies/` and the shared
commerce calculation path; API/MCP/UI consumers must not implement their own FX
calculator. See [multi-currency commerce](docs/currencies.md). A protocol adapter
translates inputs/outputs; it does not become a second owner of business rules.

Product editing preserves aggregate `revision` for legacy/absolute-stock CAS and
uses `contentRevision` only when `commerce.stock` is omitted. Never infer that an
echoed old quantity is a new inventory instruction. The editor omits untouched
stock and adopts the returned current quantity/clocks. Migration 098 observes
existing revisioned writers during rolling releases. Keep both clocks and stock
out of sandbox configuration digests; history restoration never restores stock.
See `docs/product-management.md#editing-while-orders-arrive` and retain the actual
two-replica purchase/cancellation/MCP regression in `production_foundations`.

## Cognitive commerce continuity

Merchant planning continuation belongs to existing `tasks`, conversations and
`src/agent_runs/`; read `docs/durable-agent-runs.md`. Keep native read tools, central
inference and original proposal approval. Store private completed checkpoints,
recheck credential/scope/evidence, fence completion by its lease and explicitly
continue uncertain calls. Detect request-ID replays before new attempt quota
admission. Never store opaque credentials, auto-repeat ambiguous calls, add a
second queue or turn resume into automatic writes. Keep actual worker-kill,
HTTP restart, revocation, source-withdrawal and duplicate-request regressions.

Read [the connected cognition guide](docs/cognitive-commerce.md) before changing
intelligence. It records exact implemented paths and the still-open audit scope.
`src/cognition/` owns source review, read-agent rounds, price guardrails, controlled
experiments and consent-bound preferences; `src/knowledge/` owns retrieval and the
rebuildable Qdrant projection. Extend the existing settings, capability, outbox,
chat, proposal and native checkout owners. Do not create another knowledge truth
store, pricing engine, approval queue or chat backend. Stored evidence is not
model-weight learning; exact source admission is not proof of surrounding prose.
Use one consistent versioned embedding model across replicas. Automatic model
cursors, source-trigger jobs and fenced publication share the existing index queues.

## Production contracts and Lean

- `src/verified_kernel.rs` is production code extracted to Lean. Keep its syntax
  within the closed grammar accepted by `scripts/formal/extract.py`.
- Do not weaken a business property to make a proof pass. No sorry/admit, custom
  axioms or native_decide. Required proof names are listed in `proof/manifest.json`.
- New critical pure decisions need a production consumer, precise Lean property,
  comparison cases and a negative mutation. Surrounding SQL/async/provider code
  remains explicitly unproved unless a stronger actual extraction proves it.
- Review every changed Rust/schema/build/proof file and explain the behavior and
  relevant regression evidence before explicitly updating review hashes with
  `python3 scripts/formal.py --generate --record-review 'specific review reason'`.
  CI must never refresh hashes or generate artifacts to conceal drift.
- After changes run `python3 scripts/formal.py`,
  `python3 scripts/formal/mutations.py`, Rust format/lint/unit checks and the
  affected real HTTP/PostgreSQL suites. Do not claim entire-core certification,
  a fully verified translator or bug-free behavior from these partial proofs.
- Do not add credentials, private sessions/customer data or paid provider calls
  to proof/test fixtures. Use isolated shops and local provider fixtures.

The exact proof boundary and extension procedure are documented in
`docs/formal-verification.md`. Required GitHub verification checks must stay active.

## Internationalization contract (mandatory for every new module)

- Every customer/merchant-facing field (including shipping/payment names and descriptions,
  tax labels, country/region names, product names, SEO, rich descriptions and category content)
  must accept enabled shop content languages. Do not hard-code four product languages.
- Content editors must use `shared/i18n/ContentLanguage`, `ContentLanguagePicker` and
  `LocalizedField` (or `shared/geography/TranslationFields` for object maps). One
  selected content language applies to the entire editor, including nested flow
  nodes. Do not render separate text inputs/areas for every language. The localization
  gate rejects stacked language value fields; keep its negative controls passing.
- Use the shop's `mainLocale` as the per-field fallback. `null`/missing means inherit;
  an explicitly empty description must remain empty. Never save inherited values as
  fabricated translations or silently copy names into every language.
- All new interface text and bundled content ships in English, German and Spanish;
  preserve French where supported. Use typed shared vocabulary modules, never raw JSX
  text/labels. `npm run localization` is required in CI. No legacy literal baseline
  or record-legacy bypass is allowed. Conditional/fallback/template copy, local
  string bindings and display props also belong in vocabularies. The explicit
  `localization-tokens.json` list is only for proper names, protocol identifiers,
  units and artwork lettering; never add interface prose to silence a failure.
- Preserve every `{parameter}` in all translations. Use `npm run translations`
  to export/import existing typed catalogues; imports validate all keys/locales
  before writing string literals. See [the translation guide](docs/localization.md).
- External app hosts pass interface/content/main locales and enabled languages.
  Guest apps use `sdk.uiText` for controls and `sdk.text` for merchant content;
  native and product-slot apps use the same main-language fallback. Do not slice
  a locale and hard-code English as a content fallback. Verify a non-English-main
  shop and a fifth content language; arbitrary third-party UI needs its own checks.
- Reuse `shared/geography` search/group pickers for country or region selection.
  Country checkbox walls and unvalidated free-text subdivision IDs are prohibited.
- Newly enabled delivery countries require explicit tax configuration and valid shipping
  and consumer payment coverage. Do not invent tax law or automatically set new countries
  to a zero tax rate. Destination conditions run through the existing native Rule Builder.
- Translation/model output is untrusted. Preserve URLs, IDs, units, media and document
  structure; validate content, tenant permissions and expected revisions on apply.
  Bulk operations must persist progress and process bounded batches. Test inheritance,
  a non-English main language, tenant isolation, stale versions and provider failures.

## Tenant isolation contract

- Treat unrelated merchants as separate tenants; sales channels within a tenant
  are shared commerce contexts, not independent tenant security boundaries.
- Derive identity/membership in authentication middleware. Never trust caller
  principal/tenant fields, model output or app arguments as authorization.
- Scope object reads/writes/deletes by tenant and ID, plus customer ownership
  where applicable. MCP, jobs and extension entry points use the same checks.
- Relations between tenant tables need composite tenant-aware foreign keys.
  New ID-only references must have a scoped counterpart; the schema guard in
  `scripts/security/tenant_schema.py` rejects missing containment.
- Add real own/foreign-shop regressions for new object entry points. Confirm
  denied mutations leave victim state unchanged; UUIDs are not authorization.
- Customer account orders, receipts and downloads require the immutable native
  order-customer ID binding. Reuse `accounts::ORDER_ACCOUNT_SCOPE`; never infer
  historical account ownership from a matching unverified contact email. Legacy
  unbound orders remain CRM records; paid guest files retain exact original cart
  capability checks. Do not backfill financial identities by email during signup.
- Verified-purchase reviews require original cart or immutable account purchase
  proof. Review identity and customer rule facts use the canonical cart/account
  namespaces; guest contact email cannot reserve another actor's review or count
  as that actor's submission. Migrations must not guess old author identities.
- Run the registered `tenant_isolation` suite. Do not describe foreign keys,
  app-only RLS or selected Lean policies as complete core/SaaS isolation.

## Authenticated SQL authority

Read `docs/authenticated-database-scope.md` before changing pools, middleware or app
DDL. `scoped_pool` owns transaction-local signed tenant/personal/system contexts;
`database_scope` owns role-bound tickets and their rotation. Never authorize from
`rac.tenant`, `rac.actor` or `rac.system` alone. Signed mode uses separate restricted
tenant/system logins within one `DB_POOL_MAX`, with no migration credential in the
serving container. Normal public shop requests receive tenant/denied scope, not
system scope merely because they are public. Native identity, schema, inference
configuration and coordinated staging owners explicitly retain system authority.

Keep the restrictive authenticated policy in addition to existing tenant/domain
policies. New core tenant tables need forced RLS, the authenticated policy and
explicit tenant grants; strict startup rejects missing coverage. App entity and
relation installation uses the native schema owner and `apps/schema_scope` in the
same transaction. Tenant SQL must never own those tables or create public schema
objects. Preserve historical pre-099 migration replay without a normal serving
bypass. Test through actual separate database logins, HTTP/MCP, private actors,
pool reuse, restart and signing-key rotation. `SET ROLE` on a migration connection
does not prove this boundary. Staged rollout and enforced production are distinct;
do not claim deployment from local tests. Connector storage has its own service
role and is not granted to Core's tenant connection.

## First-party service language boundary

**Bundled production commerce and standard provider services run in Rust.**
Python remains for development tools, tests, documentation, the explicit one-time
legacy-data migration and independent example apps. Its presence in the repository
does not make it a supported first-party production runtime.

| Python location / purpose | Allowed boundary |
| --- | --- |
| Verification, differential tests, source/coverage checks and site generation | Development/CI tools only; never required to serve a commerce request or deliver a notification. |
| `scripts/connectors.py` | Local lifecycle tooling that launches the compiled Rust connector; it is not the email/provider implementation. |
| `scripts/migrate_connector_state.py` | Explicit offline reader for the old SQLite/Fernet data. Stop the old worker and preserve its backup/key first; pipe records to Rust `connectors --import-legacy`, which validates and atomically re-encrypts/imports into PostgreSQL. Never import automatically during normal startup. |
| `scripts/mcp_stdio.py` | Optional client-side JSON-RPC bridge. The hosted `/mcp` server and its commerce operations run in Rust; no hosted Python MCP backend. |
| `reference/connectors-python/` | Archived comparison implementation for differential fixtures and migration understanding. Do not resurrect, import into serving code or package it as a production service. |
| Independent Product Lab / service-example / third-party apps | Deliberately language-independent extension examples, reached through extension contracts. They must not become a required dependency of the core or bundled standard services. |

The final runtime stages of `deploy/Dockerfile` (commerce) and
`extensions/services/connectors/Dockerfile` (standard services) contain **no Python
interpreter**. Keep this boundary when changing images or startup commands: no
Python installation, `.py` entry point, runtime Python subprocess, archived worker
or fallback provider implementation in either production image. Build/CI tools
and optional independent app images are separate scopes.

The former `email_config.py`, `email_templates.py`, `email_service.py` and
`email_delivery.py` are reference code, not current service owners. Configuration,
templates and delivery belong to `extensions/apps/email/src/`; shared actions and queues belong to `extensions/services/connectors/src/`; use the
module table in [the Rust service guide](docs/rust-services.md) to find each owner.
Do not introduce SQLite, a filesystem spool or process-local authoritative queues
beside the PostgreSQL connector queue. Preserve forced tenant RLS, the dedicated
non-owner production role, encrypted credentials, bounded worker admission and
explicit handling of uncertain external sends.

For a runtime extension or port:

1. Identify the existing module, API/app contract, event producer and actual consumer.
2. Extend the Rust owner while keeping API, MCP, flow and frontend contracts aligned.
   External apps can keep their own language; do not pull them into the public core.
3. For persisted legacy data, document the explicit backup, stop, import and cutover
   path. Never run old and new dispatchers simultaneously against the same workload.
4. Verify the real path with isolated PostgreSQL tenants and local provider fixtures.
   Use the registered `rust_connectors` / `email_tests` suites when changing these services;
   preserve the original comparison fixtures, concurrency and migration checks.
5. Update module ownership and service documentation. Check the final runtime image
   and startup path, not merely whether Rust code exists or unit tests pass.

## Sales-channel access and domains

Use the existing `sales_channels` and `hosted_frontends` owners; see `docs/channel-management.md`. Pause/privacy is enforced in shared authentication admission across Store API, UCP/MCP and hosted frontends. Never trust caller preview-principal headers or bypass checks for caches. Browser previews require a personal session, current membership and matching channel revision; they cannot purchase or modify accounts. Domain aliases retain canonical Experience identity and revision checks. Original native Storyfront channel bindings remain immutable; do not silently substitute a channel while its checkout still uses the imported one.

## Managed Experience apps

Experience onboarding must include `appId: "storyfront"` in the existing hosted-frontend mount.
`apps/hosted.rs` installs through the existing immutable package registry inside that transaction;
`hosted_frontends.app_id` is the tenant-aware dependency. Never synthesize an "installed" app
in the UI, install it from GET, or create another connection/editor registry. Migration 055
repairs historical mounts once. Preserve deactivation dependency checks and shared connection
cards in Apps/Storyfronts; original Storyfront code stays in its private repository.

## Extension platform v2 ownership

Read `docs/app-platform.md`, `docs/app-security.md` and `docs/app-studio.md` before
changing apps. `src/apps/` owns canonical manifest validation/signing, explicit
consent, scoped callback identities, surface grants, tenant-specific schema and
migrations, secrets, leased jobs and event delivery. Native app assets call the
existing `src/assets/` owner; exports use the same private asset path. Never add
parallel SQL stores, upload owners or direct core-API bypasses.

External credentials must bind to canonical approved package digests; remote UI
bytes need operator hash pins. Publication must not bypass installation consent,
current creator permissions, dependency checks, row/byte quotas or forced RLS.
`src/sandbox_engine.rs` is the shared Wasm engine. Prepare/probe bounded modules
before commerce transactions; WIT hooks consume bounded read-only snapshots and
use the existing native money/tax calculation owner.

Visual edits and coding-agent output share the same Manifest/AST. F5 is actor-private
and expires; it cannot call services, change live core data or release packages.
Draft CAS conflicts remain visible and do not overwrite another editor. Interface
text uses existing typed vocabularies; dynamic content uses one selected language.
New runtime routes/fields must remain aligned across API/MCP/Flow/Studio and get
real own/foreign-tenant regression checks. Never describe iframe CSP as total
hostile-code containment or local worker limits as fleet-wide admission.

### App ontology ownership

Optional `intelligence.ontology` belongs to the canonical native app manifest.
`src/apps/ontology.rs` projects only selected fields/current revisions from the
existing permission- and tenant-scoped native list. API, MCP and planner context
consume this same view; App Studio and coding agents edit the same schema.
Namespace app-owned node/edge types. Keep graph labels in `LocalizedField` and the
shared content-language inheritance system; ship UI vocabulary in EN/DE/FR/ES.
Never create another app knowledge database/ledger, bypass native reference FKs,
or treat these records as confirmed product claims. Source admission and merchant
fact confirmation still belong to the existing product claim compiler.

### App patterns belong to plugins

First-party domain app patterns live in `extensions/apps/<app>/manifest.json`,
including `returns-workspace`, `product-advisor` and `erp-handoff`.
The App Studio recipe picker only clones these canonical packages and uses the
existing Manifest compiler. Keep app-owned models, UI, AST and event declarations
in their package; never reimplement returns business logic in `src/` or the picker.
The Rust core owns shared admission, tenant storage, reference validation and the
bounded runtime. Install/review patterns in an actor-private preview or staging
before an explicit release. Returns records are private, order-bound app data;
they do not authorize refunds, change order/payment states or bypass Payments.

### All plugin/app files remain under their package owner

Every plugin keeps its implementation, native Manifest/AST, UI, styles, translations,
assets, templates and app-local tests in `extensions/apps/<app>/` (or its independent
private repository). Installation/release registers immutable packages and app data;
it never copies source into `src/`, `frontend/src/`, shared system folders or core
migrations. The same rule applies to AI-generated apps. Database schema belongs to
the existing app migration contract, not a second manually installed core schema.

Host routing/registration, generic runtime/rendering, authorization, callbacks and
shared SDKs may reference app-owned packages; they must not own app business logic.
Shared connector hosting belongs to `extensions/services/connectors/src/`; Email,
Google Analytics, Gmail and Slack implementations stay in their app roots. The
connector entry binary is separate from the commerce library. Plugin frontend modules
receive the same architecture, localization and coverage gates as the host frontend.
`scripts/testing/plugin_ownership.py` rejects known leakage paths and unsafe pattern
access. Folder containment does not itself prove runtime isolation: declarative
apps use the bounded host/F5 runtime, network apps use the existing service gateway.
The legacy PayPal compatibility adapter remains host-native for old configured
payment attempts; it is app-owned and must never be called sandboxed. New external
providers use the generic remote contract. Removing that compatibility path requires
an explicit existing-attempt/provider migration, not a cosmetic file move.

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

## B2B and EDI ownership

`src/b2b/` owns native company/unit grants, private catalog admission, purchasing
policies, approved quote/list contracts and serialized checkout spending. Reuse
shared money/tax, checkout, inventory, document, audit and outbox owners. Do not
implement an EDI pricing ledger or purchase automatically as a mapped customer.
EDIFACT/UBL/cXML codecs, partner profiles, transport and app UI stay entirely under
`extensions/apps/edi/` or another app package. App callbacks require the current
approved digest/key and creator rights; immutable receipt export requires explicit
orders/documents/PII consent. Keep bounded-profile, no-network-certification limits
visible until corresponding official validation/transport acceptance exists.
See `docs/b2b-commerce.md`, `docs/edi.md` and `src/b2b/README.md`.

`src/ucp/` is a transport adapter only. Its `ai.veyndo.app.shopping.b2b_negotiation` extension invokes the existing `b2b.*` quote/approval owners. Keep merchant offers and buyer acceptance separate; retain current customer membership, original cart/currency/expiry and both CAS revisions. Platform profiles establish compatibility, never identity or permissions. Reuse the shared public HTTPS egress client for bounded profile reads; never forward secrets or allow private DNS/redirects. Do not introduce another quote store, approval engine, FX calculator or outbox. The detailed versioned contract is `docs/b2b-ucp-negotiation.md`; RFQs/approvals/spent budgets remain operational, never staged configuration.

## Marketplace ownership

Seller protocols, mappings, credentials, inbox logic and Studio UI belong only in
`extensions/apps/marketplaces/`. Generic paid external-order/channel host contracts
belong to their existing Core domain owners. Use native app jobs/consent, tenant
references, exact currencies, stock, orders, guest projection, receipts and outbox;
never implement another marketplace commerce ledger, money calculator or queue.
An accepted submission is not a published offer; ambiguous writes must remain
fenced. Missing source tax/payment facts require explicit review, never estimates.
Run the registered `marketplaces` provider suite and marketplace UI regressions;
see `docs/marketplaces.md` for current provider boundaries.

## Behavioral intelligence ownership

`src/cognition/behavior/` owns consent-bound native visitor observations and their
derived report/journey graph. Reuse `session_signal_events`, native carts/accounts,
current legal receipts, product knowledge, forced tenant RLS and composite foreign
keys. Never introduce another analytics identity, cookie, event ledger, pricing or
order truth. Do not record raw IP/UA, search/question text or visitor-supplied customer
IDs. Reports need `knowledge.read`; individual journeys need `customers.pii` and
entity links require their existing read rights. Geography requires a trusted
server ingress; client country headers are not authoritative. Native storefront
capture and Studio use the same HTTP/MCP contract. External frontends must adopt
the consent-bound API explicitly; a configured Storyfront does not imply capture.
Run `behavior_intelligence`, privacy/isolation suites and behavioral UI regressions.
See `docs/behavior-intelligence.md` for retention, counts and learning boundaries.

## Cross-feature integration continuity

Read `docs/feature-integration.md` before extending POS, B2B/EDI, marketplaces or
visitor observations. Every release selection needs its own current domain right;
`team.manage`/environment access never delegates catalog, app or B2B authority.
Use `marketing/channel_config.rs` for native/released channel validation and
`marketing/flow_policy.rs` for current native/app action permissions, final settings,
installed target/schema and activation admission inside the write transaction.
Acquire the shared automation lifecycle lock before settings/app locks in native
configuration writes, matching selective release. Rebind published Flow actors;
queued execution still rechecks current rights.

`b2b/staging.rs` clones only company/unit policy and catalog selection. Release
uses `organization::save_tx` and `catalog::save_tx` in the existing transaction,
parents first; never clone/rewind employees, approvals, quotes, lists or spending.
History restore replays company/unit configuration only. Purchasing-policy writes
lock the existing commerce settings before policy rows, so method/currency removal
cannot race validation. Preserve method/currency dependencies in their shared owners.

Native visitor settings belong to `legal.behaviorAnalytics` in the existing
commerce configuration, including per-channel inheritance, history and release.
Enabled, retention and hourly intake are enforced by the same native policy and
current consent, not just hidden UI controls. Staging/preview API intake is denied;
observations are never release units. External frontends require explicit adapters.
Run affected PostgreSQL/HTTP suites and real UI regressions; keep provider/hardware
acceptance and partial formal-proof boundaries explicit in docs and public pages.

### Shared dispatcher stack boundary

`capabilities::invoke` selects and returns a boxed domain future synchronously,
before polling the selected child. Preserve this boundary across HTTP/MCP/planner
calls; do not embed all domain futures in one asynchronous dispatcher. The Linux
coverage build previously overflowed its worker stack on `pos.cart` despite small
future-state sizes and passing local default-stack tests. Test actual HTTP/MCP
operations in debug/coverage builds; raising production worker stacks or a future-
size-only assertion is not a repair. Domain rights and native owners stay unchanged.

## Tenant role and Studio admission ownership

Reusable roles belong to `workspace_roles` and `src/auth/roles.rs`; `membership_grants`
is the active current-role projection consumed by sessions, keys, callbacks and workers.
Only reserved owner authority is special. Do not reintroduce static role arrays for
access decisions or a second role/key store. Team delegation and invitation acceptance
use the tenant lifecycle lock, then rehydrate the actor and target grants; retained
explicit overrides also require delegation checks. New domains need named scopes in
`auth::SCOPES`, localized shared permission labels, native HTTP/MCP/action guards,
Studio presentation admission, history/staging policies and real denied-access tests.
Use an additive migration to evolve existing default definitions; never rewrite a
deployed seed migration. Generic app/AI Flow results are not safe merely because a
user can read automation status. Preserve cleaned summaries for limited readers.
B2B switches live in shared versioned commerce settings; channel inheritance may not
relax that global policy. See `docs/studio-access-and-setup.md` for the current owners.

Read [the system consistency audit](docs/system-consistency-audit.md) when adding
cross-domain entry points. Knowledge-source `document:*` diff/release units require
`knowledge.read`/`knowledge.write`, never catalog rights. MCP discovery must use
the owning operation's scopes; unrelated read grants must not gate write-only
operations, and channel grants must not advertise rule tools. History discovery
must require the same per-entity read/write/PII conjunctions as invocation; reuse
the native entity registry and PII classification rather than another scope list.
Classify every new
persisted entity's CAS revision, retained history, restore and staging policy
explicitly; a revision counter alone is not full content versioning. Keep live
financial and operational effects excluded from configuration rollback.

## Provider-neutral shipping ownership

Carrier-specific protocols, address conversion, credentials, booking receipts and UI
belong to `extensions/apps/<carrier>/` or its independent repository. No carrier is
selected by the general contract; never copy provider code into `src/commerce` or
system directories. The synthetic shipping fixture is test tooling only. Reuse native app
records/jobs and `operations/order_documents.rs` through scoped callbacks; PDFs are
private immutable order receipts, never public product assets. Allocation changes
use `commerce/delivery_split.rs` with current rights, CAS and one replay ledger.
`operations/delivery_booking.rs` freezes the native package before external booking;
unknown intents block split, dispatch and cross-provider substitution until the
original PDF or a confirmed no-booking release is acknowledged. Pure fulfillment
guards belong to `src/verified_kernel/fulfillment.rs` and the exact extraction map.
Label creation does not mark dispatch or decrement stock. Unknown paid effects must
remain fenced across restarts; recovery retrieves only a known original document.
Native app save callbacks require explicit stable IDs and revisions.
See `docs/shipping-workflows.md` and `extensions/apps/assistant-examples/shipping.json`.

## Shared grid ownership

New Studio entity directories reuse `frontend/src/shared/grid/AgenticGrid` and native
list APIs. Domain adapters provide explicit columns, validated server filter/sort keys
and existing detail navigation. Do not implement browser-only global filtering, a
second data/API owner, model SQL or a model-supplied principal. `grid_schema` owns
HTTP/MCP/model criteria; `grid_plan` shares central inference and current domain/PII
rights. Model suggestions require visible review before a native read. Layout storage
contains column IDs/density only, never rows, credentials or PII search strings.
Private stages use their existing request context; no operational records become
release units. App table presentation may reuse the shell but cannot widen its
installed action/filter/write contract. All controls ship EN/DE/FR/ES and support
keyboard/touch ordering, reduced motion and contained responsive overflow.
Run `grid_directory`, relevant native list/isolation suites and grid/app UI tests.
See [agentic grids](docs/agentic-grids.md).

## Native Admin creation ownership

Customer creation belongs to `operations/customer_create.rs` and existing
`accounts::Contact`/address persistence, history and outbox. A CRM-only profile
has no issued storefront credential; never mint customer sessions for merchants
or infer historical order ownership from email. Manual-order review/complete belongs
to `operations/manual_orders.rs`; it uses actor-private native carts, current
compound rights/PII, selected channel/language/currency and original checkout.
Keep settings → channel → customer FOR UPDATE → cart lock ordering for this path.
`manual_order_admission.rs` rechecks final native payment mode and channel/catalog
admission under those locks; no real provider is called by manual orders. The small
admin-payment decision is an extracted Lean policy; async SQL remains unproved.
Direct token SQL paths (especially account logout and purchased downloads) must
exclude private carts or reuse the shared admission. Operational customer/order
records stay in their tenant and never become configuration release units.
Studio/API/MCP share `creation_schema.rs`; the shared customer picker and modular
creation/review components must not introduce alternate pricing, stores or checkout.
Run `admin_creation`, CRM/accounts/review/POS regressions and responsive browser flows.

## Channel-to-app setup ownership

Channel creation reuses the native revisioned owner. In-place marketplace setup
belongs to `extensions/apps/marketplaces/studio/MarketplaceWorkspace`; reuse the
existing consent, package activation and MarketplacePanel with its channel context.
Do not link channel actions to an unselected app library or clone provider forms.
`extensions/apps/storyfront/studio/StoryfrontCreate` opens the existing private
Experience self-service entry with public identifiers only. The private service
owns current Core admission, its durable creation job and original Storyfront import;
never build a public renderer, second catalogue or new identity broker for this link.
The ordinary SaaS/channel path must not install Storyfront until explicitly connected.
See `docs/channel-setup.md` for ownership, setup and evidence boundaries.

## Personal workspace and standard storefront design ownership

Read `docs/personal-workspace-and-shop-design.md` before extending these paths.
`studio/personal` owns bounded per-person/live-shop presentation preferences, never
roles or a new executor. Integration credentials cannot assume creator identity.
Use native grids for pinned views; omit free/PII search criteria and hand off safe
filters in memory, never in URL/localStorage. Preferences/history are not release units.

`extensions/apps/site-builder/` owns page/theme schemas, renderer, WYSIWYG UI and
reference-guided proposal preparation. `site-forms/` owns public declared-form
validation and private inbox UI. Host code only registers generic publication,
append-only intake and managed record history. Do not move app business behavior
into core folders, create a parallel CMS database or reimplement private Storyfront.
Manual/UI/API/MCP/agent writes use the same validated app fields and native save/CAS.
Normalize model documents before both preview and persistence; reference data is
untrusted and deselected style/structure/content must be enforced on the server.

Public pages require native publication state/time/channel filtering. Form answers
require customers.read + customers.pii, never enter public context or release units,
and cannot use generic edit/history restore. History keeps original read scopes and
current field projection. Native app writes and selected releases take package fences
before record locks. Keep the real concurrent save/release regression. Extend central
inference/native tasks/outbox/Flows, not a second planner, queue, scheduler or checkout.

## App Studio placements, assistant and installed settings

Read `docs/app-studio-workspace.md` before changing these paths. Multiple app
placements compile through `assistant-placements.ts` into the existing Manifest;
all native mounts (including checkout.content/checkout.summary) use the shared
registry and current action authorization. Do not add a second slot or UI executor.
`AppAgentDrawer` reuses the shared composer/proposal import and leaves the selected
canvas intact. Toolbox width and thumbnails are presentation only. UI event
previews project the bounded AST into `FlowTopology`; the native Flow owner still
executes outbox events. Never persist a separate flow graph for button actions.

`apps/settings.rs` owns generic declared installed configuration through the
existing encrypted `apps/secrets.rs` store. Current personal administration,
active package digest, explicit approval and revision are required. Values stay
live-only; no sandbox copy, release, restore, task export or public projection.
Only private service actions receive server-resolved `_appSettings`; browser/native
views do not receive secrets. Preserve package/table/index admission caps and
current scope intersections for permanent integration keys. A permanent key never
becomes an owner identity or permission snapshot. App business code stays in its
app directory.

## Operation registry and business-capability continuity

Read `docs/platform-hardening.md` and `docs/business-capabilities.md` before expanding
agent execution or app architecture. `capabilities/registry.rs` binds native schemas,
boxed domain routing, discovery and safe read-agent exposure; transports do not own
second name/schema/visibility lists. `ToolContract` describes native and app tools;
metadata never grants rights. Domain object/PII/CAS/business checks stay authoritative.
An app output-contract failure may follow a real external effect: preserve its
non-retryable/uncertain boundary, never automatically re-run it as harmless validation.

Outbox dispatch scheduling metadata is operational, forced-RLS and never a release
unit. Lock scheduling rows rather than tenant roots, preserve per-event savepoints
and exact original outbox consumers. A fair tenant batch is not independent subscriber
checkpointing. The remaining system-role/cookie/CSP issues in the tracker are not
repaired merely by safer identifier quoting or successful ordinary isolation tests.

Extend the canonical Manifest for complete business capabilities; reuse existing
data, decisions, history, staged publication, Flows and central inference. No second
app ledger, source-copy installation, queue, CMS, pricing owner or private Storyfront
implementation. Choose the weakest actually supported runtime and keep unsupported
hosting/ABI/canary/replay capabilities explicit. New operation extension points may
narrow decisions but never replace core authorization or financial invariants.

`Manifest.capability` version 1 owns localized intent, assumptions and frozen pure
commerce examples. `apps/business_capability` converts synthetic fixtures to the
existing WIT snapshots; `commerce_hooks::verify_package` uses the same sandbox as
checkout. Run it before immutable developer save and native installation. Never
replace expected outputs from model guesses to make a case pass, claim empty
cases verify behavior, or export customer history/secrets as package fixtures.
Existing AI edits retain the contract; explicit new versions remain reviewable.
Business code stays in its app package. These cases are not whole-app proof or
human-confirmation provenance; keep the remaining business-capability gates open.

## Browser authority continuity

Read `docs/browser-sessions.md` before changing browser transports. Extend existing
`user_sessions`/`customer_sessions`; no parallel login gateway or browser bearer store.
Keep explicit API/MCP clients compatible, exact origins, per-tab proof fences, and
current server-side membership/tenant checks. Public /api storefront calls must never
inherit ambient merchant authority. Passive session/profile responses must not set
cookies or update accepted customer proofs. Capture tenant and session generation
before requests; late successes/401s cannot change a newer identity or another shop.
The entire merchant credential origin admits only build-owned scripts. Do not widen
that CSP for analytics or Maps; shared checkout retains manual address fallback.
Preserve cookie/MFA/handoff/MCP/preview/download/checkout negative regressions.
