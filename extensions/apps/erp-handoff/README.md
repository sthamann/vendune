# ERP handoff

A native workspace for integration records and event handoff. A real ERP connector still requires a separately approved external service.

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
