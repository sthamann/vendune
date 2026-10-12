# Returns workspace

Private order-bound returns cases: reason, received date, status and internal notes. The plugin does not issue refunds or mutate order/payment states.

`manifest.json` owns the app's models, translated labels, native views, actions,
permissions and bounded UI instructions. The App Studio pattern picker imports
this package directly; visual edits and coding-agent edits use the same Manifest.
There is no parallel domain implementation in the commerce core.

## Try safely

Choose this pattern in **Studio → Developers**, edit it visually, then use **F5**
for an actor-private preview or review/install a version in staging. Publishing
requires an explicit version release. Preview cannot execute live provider effects.
The host validates the package, permissions and object references; app records
use the existing tenant/app storage and quotas. A native declaration is executed
by the bounded host runtime, not an unrestricted process with SQL/network access.
See [app isolation](../../../docs/app-security.md) and
[App Studio](../../../docs/app-studio.md) for the exact trust boundaries.

Labels ship in EN/DE/FR/ES and inherit the shop's main language through the common
content editor. MCP exposure and public reads are explicit in the package; this
example does not grant extra rights merely because a coding agent created it.

Tests: `frontend/tests/unit/app-building.test.tsx` validates package cloning,
private/context-bound records and the actual native save action. The registered
`app_assistants` HTTP/PostgreSQL suite installs the same generated package and
checks core-reference ownership and private data access.

## Version 0.2.0: one confirmed transition per save

The package owns `new → review → received → closed`, with a review-to-closed
alternative. Its `workflow` contract makes `order_id` immutable after creation.
The generic host enforces initial state and allowed edges inside the same
revision/outbox transaction as the record write. The native form displays only
permitted next states and retains the confirmed revision after each save; multiple
cases for the same order are selectable by their translated subject.

A closed case cannot be reopened by changing its payload. This app does not
implement refunds, labels or a carrier integration. The real `app_assistants`
suite checks all edges, foreign references, denied mutation, and unchanged outbox
state on rejection. AI presentation edits preserve the existing workflow.

Release the app contract separately from case data. A new record imported into
Live must obey the declared initial state; staging is not a lifecycle bypass.
