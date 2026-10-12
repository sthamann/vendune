# EDI is an independent app, not another commerce engine

The app at `extensions/apps/edi/` contains its own Manifest, mappings, Rust process,
codecs and tests. It uses the existing app gateway and immutable native callbacks.
App Studio clones that same package; a coding agent edits the same Manifest.
Neither installation nor release copies app files into core system directories.

## Implemented document profiles

| Direction | Profile | Result |
| --- | --- | --- |
| Inbound | UN/EDIFACT ORDERS D96A / D23A, bounded segment profile | Validate envelope/references/counts and supplier SKUs/whole quantities; map to an explicitly approved company unit and buyer. |
| Inbound | UBL 2.1 Order, bounded fields | Parse namespaced party/document/currency/SKU/quantity fields. |
| Inbound | cXML OrderRequest, original orders | Parse From/To identities, order number, currency and supplier items. |
| Outbound | EDIFACT ORDRSP / DESADV / INVOIC D96A | Render native order response, already-issued delivery note or invoice snapshots. |
| Outbound | UBL 2.1 OrderResponse / DespatchAdvice / Invoice | Render those same native immutable snapshots; no second document numbering or pricing engine. |

This is **bounded syntax/profile support**, not arbitrary trading-partner equivalence,
EN16931/Peppol validation, certified transport or automatic regulatory compliance.
XML parsing/escaping is tested; complete official UBL XSD and partner business-rule
validation are not yet an acceptance gate. No AS2/AS4, SFTP, VAN or Peppol connection
is bundled. Add these as app-owned transports with explicit partner configuration,
credentials, signatures, acknowledgements and uncertainty handling.

Imported prices/totals are informational: the buyer's actual checkout uses native
prices, taxes, stock, payment/shipping methods and B2B approval/budget policies.
Unsupported EDIFACT segments/terms fail explicitly. The XML profiles do not preserve
all possible source extensions; review required partner terms before adoption.
Invoice export currently requires native net-tax mode, consistent positive VAT
and line totals matching the native net total. Mixed/zero/exempt VAT or unrepresented
shipping/discount charges are rejected until a corresponding profile is implemented.
Older order snapshots lacking supplier SKU are rejected rather than reading mutable
current catalog data. A delivery note is not proof of a physical shipment. Cancelled orders cannot be exported as accepted order responses. Replaying an identical inbound document rechecks current authority and preserves its existing receipt revision.

## Install and configure

1. In App Studio choose **EDI procurement**; keep its private partners/messages/inputs entities and reviewed service actions. The default package ID is `edi`; clones need a matching server `APP_ID`.
2. Install into a controlled workspace and approve its exact immutable digest. Grant `data.read`, `data.write`, `b2b.read`, `b2b.manage`; outbound documents additionally require `orders.read`, `documents.read`, `customers.pii`. The current creator must hold the matching native rights.
3. Create the app callback credential with those explicit permissions and an expiry. Store it only in the app service's server configuration. Revocation or package upgrades invalidate it.
4. Run `cargo build --locked --bin edi-gateway`. Set `APP_BIND_ADDR` (default `0.0.0.0:8798`), strong `APP_TOKEN`, optional `APP_ID` and `APP_EDI_TENANTS` as described in the app README. Register the service using the existing `APP_SERVICES` operator configuration; secrets stay server-side.
5. In the app, create one active mapping per partner: document format, sender/receiver identity, purchasing-unit reference and buyer customer reference. Mapping IDs are private app data with tenant-aware native references.
6. Use `validate_document`, then `import_document`. Validation alone has no commerce effects. Import creates a private native list owned by the mapped buyer; it cannot place an order.
7. Sign in as that buyer, select the company unit, apply the imported list and complete the ordinary approval/checkout. Issue documents in the existing order administration.
8. Call `export_document` with `partnerId`, `format`, `kind`, `orderId` and, for invoice/delivery note, `receiptId`. A rendered document is returned, **not sent**. The response reports its source snapshot and `networkCertified:false`.

The private native `record_action` callback can invoke only declared list/save
handlers under current Manifest/key/action permissions. It cannot recursively
call external services. `b2b_requisition` requires explicit B2B management and
valid mapped native identities. `receipt_snapshot` requires documents, orders and
PII authority and the matching tenant/order/receipt. It never creates a receipt.

## Reliability and security

The document number plus partner/envelope identifies an import; a SHA-256 source
hash detects conflicting reuse. A replay rechecks the active partner and native
buyer/unit/catalog before returning the existing private list. Durable receipts
use ordinary app records/outbox, with no app-owned filesystem queue or new SQL store.
A restart does not forget an import. Input IDs/quantities/document length, XML node
count, gateway body size, callbacks and process admission are bounded. DTD/external
entity payloads are rejected. Callback URLs are operator-fixed HTTPS origins
(loopback allowed for tests); documents cannot choose an egress destination.

Run `DATABASE_URL=... TEST_PSQL=... python3 scripts/verify_integration.py --only edi`
in a disposable database. It tests three imports, conflict/replay, wrong partner,
foreign identity, native checkout, immutable native outbound documents, revoked
credentials and cold restart. `cargo test --bin edi-gateway` covers parser and
serializer counterexamples. No real external messages or payments are sent.

Primary protocol references: [UNECE ORDERS](https://service.unece.org/trade/untdid/d23a/trmd/orders_c.htm),
[UBL 2.1 Order](https://docs.oasis-open.org/ubl/os-UBL-2.1/mod/summary/reports/UBL-Order-2.1.html),
[cXML](https://www.cxml.org/), [AS2](https://datatracker.ietf.org/doc/html/rfc4130),
[AS4](https://docs.oasis-open.org/ebxml-msg/ebms/v3.0/profiles/AS4-profile/v1.0/),
[Peppol billing requirements](https://docs.peppol.eu/poacc/billing/3.0/2025-Q4/bis/).
