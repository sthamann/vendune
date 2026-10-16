# frontend ownership

Root AGENTS.md also applies. Rules below were moved from the root, not weakened.

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
See [agentic grids](../docs/agentic-grids.md).

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

