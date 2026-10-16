# src ownership

Root AGENTS.md also applies. Rules below were moved from the root, not weakened.

## Production contracts and Lean

- `crates/kernel/src/verified_kernel.rs` is production code extracted to Lean. Keep its syntax
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
explicit tenant grants; strict startup rejects missing coverage. App model installation uses the native system owner; shared records/indexes/references
use fixed forced-RLS tables and transactionally maintained projections. Read
`docs/app-data-storage.md` before changing these paths. Never reintroduce per-shop,
per-app, per-model or per-version tables/indexes. Tenant SQL must never own those tables or create public schema
objects. Preserve historical pre-099 migration replay without a normal serving
bypass. Test through actual separate database logins, HTTP/MCP, private actors,
pool reuse, restart and signing-key rotation. `SET ROLE` on a migration connection
does not prove this boundary. Staged rollout and enforced production are distinct;
do not claim deployment from local tests. Connector storage has its own service
role and is not granted to Core's tenant connection.

## Sales-channel access and domains

Use the existing `sales_channels` and `hosted_frontends` owners; see `docs/channel-management.md`. Pause/privacy is enforced in shared authentication admission across Store API, UCP/MCP and hosted frontends. Never trust caller preview-principal headers or bypass checks for caches. Browser previews require a personal session, current membership and matching channel revision; they cannot purchase or modify accounts. Domain aliases retain canonical Experience identity and revision checks. Original native Storyfront channel bindings remain immutable; do not silently substitute a channel while its checkout still uses the imported one.

## Managed Experience apps

Experience onboarding must include `appId: "storyfront"` in the existing hosted-frontend mount.
`apps/hosted.rs` installs through the existing immutable package registry inside that transaction;
`hosted_frontends.app_id` is the tenant-aware dependency. Never synthesize an "installed" app
in the UI, install it from GET, or create another connection/editor registry. Migration 055
repairs historical mounts once. Preserve deactivation dependency checks and shared connection
cards in Apps/Storyfronts; original Storyfront code stays in its private repository.

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
guards belong to `crates/kernel/src/verified_kernel/fulfillment.rs` and the exact extraction map.
Label creation does not mark dispatch or decrement stock. Unknown paid effects must
remain fenced across restarts; recovery retrieves only a known original document.
Native app save callbacks require explicit stable IDs and revisions.
See `docs/shipping-workflows.md` and `extensions/apps/assistant-examples/shipping.json`.

