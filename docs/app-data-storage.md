# App data without table proliferation

Managed apps share four fixed PostgreSQL tables. Installing an app, adding a shop,
creating a model, declaring an index or opening a sandbox creates logical rows;
it does not create another physical table or index. Native commerce tables,
existing app history and the independent connector database contract stay separate.

| Table | Responsibility |
| --- | --- |
| `app_models` | Shop/app/model definition and installed schema version |
| `app_records` | Original record ID, CAS revision, schema version and typed JSONB fields |
| `app_record_indexes` | Declared scalar lookup/unique values using fixed bounded-size digest indexes |
| `app_record_references` | Ordered app relationships and fixed native product/customer/order/channel/B2B/asset references |

## One contract across every consumer

The canonical Manifest still defines types, required fields, translation, choices,
validation, relationships and actions. Rust validates the same fields for Studio,
API, MCP, Flows, callbacks, AI proposals and selected sandbox releases. Apps cannot
send SQL or create PostgreSQL objects. `apps/records.rs` is the shared internal
storage adapter; app-specific behavior remains under its package directory.

The full identity is `(tenant, app, entity, id)`. Sandboxes use their admitted
private tenant and existing personal ownership/expiry checks. Equal app names,
record IDs or different schema versions in unrelated shops cannot collide.
Public reads project current declared fields only; storage metadata, removed fields,
private form answers and credentials do not become public data.

## References, uniqueness and concurrency

PostgreSQL maintains lookup values and references in the record transaction.
Ordinary database roles cannot edit the projection tables directly. Fixed composite
foreign keys preserve tenant/app/entity containment, prevent deletion of referenced
native objects and permit cyclic app imports through deferred app references.
Deleting a source removes its outgoing references; target protection remains.

Declared `indexed` fields use shared scalar lookup rows, not per-field indexes.
The existing bounded keyset/equality API remains. Values retain their JSON types;
text decimal/date representations are not silently normalized. Unique fields work
even without `indexed=true`, with database-enforced concurrency. Digests bound index
key size; read filters additionally compare the original value. A theoretical hash
collision conservatively rejects a unique write, never overwrites another record.

Package fences still precede record locks. Record locks include the complete logical
identity. Schema changes retain explicit rename/remove/convert/fill plans, immutable
package digests, record revisions and bounded recovery history. They do not execute
app-supplied DDL. A changed F5 model clears only that preview/app's rows.

## Capacity and explicit limits

Existing limits remain: 128 registered packages/shop, 12 models/package,
16 fields/model, 64 declared indexed/unique fields/package, 100,000 accounted rows
and 64 MiB of logical storage per shop/app. Accounting includes ordered relation
rows and app-owned native document artifacts. Counters are updated transactionally;
conflicting or quota-rejected writes roll back their projections and events.

The byte counter is not total PostgreSQL disk usage: shared indexes, MVCC/WAL and
retained history have their own costs. Fixed table count is not an unlimited-throughput
claim. Sandbox catalog cloning and bounded release snapshots retain their existing
record limits; this change does not implement copy-on-write product catalogs,
automatic sharding or online tenant relocation.

## Existing database cutover

This is a coordinated maintenance migration, **not a rolling storage conversion**.

1. Back up and verify the existing database using the normal release procedure.
2. Stop/drain every old Core HTTP and worker process. Keep old binaries stopped
   until new schema and code are both ready. Private services must not write app
   SQL directly; the API gateway remains their boundary.
3. Apply native migrations 101–102 with the existing migration login. Migration 102
   refuses connected configured Core system/tenant logins, including idle pools.
4. The migrator locks package/schema inputs, copies every declared physical model
   including inactive/private apps, preserves original values/IDs/revisions,
   validates every record and ordered relationship, checks deferred foreign keys
   and retires the exact verified table set without `CASCADE`.
5. Start the new Core and workers with the existing separate signed system/tenant
   connections; strict startup checks also cover the fixed app tables. Verify app
   reads/writes, native checkout, private previews and selected publication.

Missing legacy tables, invalid targets, mismatched rows/relations, quota violations
or unknown external table dependencies abort migration 102 atomically. There is no
`ON CONFLICT DO NOTHING` data loss, current-data repair, fabricated history or
`app.record.changed` event. Older unrelated legacy backup tables outside the exact
declared set are not silently deleted. Restore the pre-maintenance backup before
running an old binary again; the old binary cannot use the consolidated schema.

Migrations 001–100 remain unchanged. The old 055 hosted-package native repair now
runs after storage consolidation, so historical SQL replay never invokes the new
registry before shared storage exists.

## Verification

`app_shared_storage` exercises actual HTTP installations across eight shops and
32 packages, asserting no physical table/index growth, typed filters, same-ID
isolation, concurrent unique writes, protected projections and exact F5 cleanup.
`app_storage_migration` replays the original SQL through migration 100 and then
tests populated inactive/private tables, cyclic links, precision, translations,
NULL/empty distinctions, documents/history and atomic refusal controls.

Existing app/schema/relations/components/preview/Studio/staging/page/form suites
exercise the shared consumers. Signed-runtime and transaction-pool tests remain
required for deployment. Local verification is not evidence of production cutover.
The [dated local evidence](evidence/shared-app-storage-2026-10-15.json) records actual
results, source hashes, the resolved local oracle prerequisite and deployment limits.

The [15 October hosted acceptance](evidence/shared-app-storage-hosted-2026-10-15.json)
separately records the completed backup, drained-Core migration and public browser
flows. All eight declared legacy tables were retired. After new shop creation,
native app installations, a private page edit and selected publication, the database
still had four physical app tables and no legacy app tables, with 27 packages and
12 logical models. Existing and newly generated Storyfront shops and a new AI-seeded
standard shop completed simulated purchases; the evidence retains untested provider,
invoice, authentication, restore and localization boundaries explicitly.

[App platform](app-platform.md) · [Authenticated SQL authority](authenticated-database-scope.md) · [Testing](testing.md)

## Native object extensions

[Typed product/customer/order/company extensions](app-core-extensions.md) reuse these same four fixed tables and their existing native reference and unique projections. They do not add native columns or app-specific indexes.
