# ERP handoff

An app-owned native order-mapping workspace and an independent Rust adapter.
Version 0.2.0 includes real minimized order export, persistent receipts, signed
incoming events and explicit reconciliation. It is a reference adapter, not a
preconfigured connector for every commercial ERP.

## Ownership and configuration

`manifest.json` owns models, translations, views, actions and permissions.
`service/` owns the adapter, its private `schema.sql` and receipt lifecycle;
`tests/integration.py` owns the real process/database/provider fixture.
No ERP domain implementation or receipt table is added to the Commerce core.
The shared Rust event wire verifier is `extensions/sdk/rust-events.rs`.

Build the `erp-handoff` binary, or use this package's Dockerfile with the repository
root as build context. `compose.yaml` demonstrates non-root, read-only, bounded
process/memory/CPU deployment. Configure egress separately; these settings do not
prove isolation against every hostile remote service.

Required server-side variables:

| Variable | Purpose |
| --- | --- |
| `APP_DATABASE_URL` | App-only PostgreSQL role, neither owner nor RLS bypass |
| `APP_TOKEN` | Existing private Commerce gateway credential, at least 24 characters |
| `APP_ID` | Installed app ID; defaults to `erp_handoff` |
| `APP_CORE_URL` | Operator-owned Commerce HTTPS origin |
| `APP_TENANTS` | JSON map from tenant to `callbackToken`, `erpUrl`, `erpToken`, optional `webhookSecret` |
| `APP_BIND_ADDR` | Adapter listener; default `0.0.0.0:8797` |

Apply `service/schema.sql` with an operator account and grant the adapter role
access only to `erp_handoff_receipts`. The runtime verifies its role and sets
transaction-local tenant context. The table has forced row-level security.
Approve the actual Manifest digest in the existing `APP_SERVICES` registry and
issue an existing app callback key scoped to its tenant, digest and `orders.read`.
Never put gateway/ERP/callback credentials in app records or browser code.
Only local fixtures may enable `ALLOW_LOOPBACK_FIXTURES=true`.

## One export, explicit uncertainty

Manual `synchronize` accepts `{ "payload": { "orderId": "OWNED_ORDER_ID" } }`.
`order.placed` and manual actions use the same durable tenant/app/order receipt.
A short SQL claim commits before HTTP; duplicates never cause another export.
The core callback supplies immutable order currency, scale, integer total and
line items with customer details excluded. Individual quote line prices retain
Commerce's current representation; this is not a new money calculator.

The ERP receives `POST <erpUrl>` with an Idempotency-Key and the minimized order.
A successful JSON `receiptId` yields `accepted`; definite 4xx rejection yields
`failed`; timeout, 5xx or invalid success body yields `uncertain`. A crashed stale
claim becomes uncertain. Uncertain/failed receipts are not automatically resent.
`reconcile` explicitly queries `GET <erpUrl>/receipts/<key>` and marks accepted
only when that destination confirms its receipt. It never exports again.
`receipts` lists at most 100 tenant-bound metadata entries.

Private `/events` uses the existing gateway envelope. Optional `/signed-events`
uses the shared timestamp/HMAC/idempotency wire contract and a server-side tenant
webhook secret. Entire batches are validated before any side effect. The default
manifest requests one order per delivery and no public/MCP exposure.

## Try and verify

App Studio imports this exact package. F5/staging supports its native editor;
remote effects remain blocked there. Actual exports need an approved separate
adapter and a disposable local Live fixture. Run the registered `erp_handoff`
suite through `scripts/verify_integration.py`; it exercises concurrent manual and
event delivery, signed replay, cold restart, uncertainty/reconciliation, foreign
orders, forced RLS and the app-only database role. No paid providers are called.

**Upgrade:** 0.2.0 adds a required indexed `order_id` reference. Existing mapping
records must be explicitly associated with owned orders before this schema can
be approved; do not fabricate IDs or silently convert an old mapping store.

[Full workshop](../../../docs/app-tutorials/erp-handoff.md) ·
[Trust boundaries](../../../docs/app-security.md)
