# POS status and database startup recovery — 17 October 2026

This record separates reproduced failures, their repairs and hosted acceptance.
The public rollout of these repairs is **pending**. See [current status](../status.md).

## Found during the native app-field release

The required [GitHub run for e19f349](https://github.com/sthamann/veyndo/actions/runs/38975176363)
failed at the generic-provider POS checkout assertion. The POS owner admitted and
loaded its cart/order first, then read payment status separately. A provider commit
between those reads could return `payment.state=captured` with the older
`order.payment.state=ready` and no completion marker. This is an inconsistent
response, not evidence that a second payment should be sent.

An isolated PostgreSQL regression now holds payment admission behind a table lock,
restores an already-confirmed synthetic receipt while the request waits, and
releases the request. The former reader deterministically returned the old order
with the new payment. The actual provider lifecycle and exactly-one completion
event remain checked separately; the fixture never sends another capture.

The existing payment owner now projects payment, latest job and the native order
in one SQL statement snapshot. Native cashier, channel, customer/cart capability
and current permission admission still precede the read; the joined sale must
also match the admitted native cart ID. No financial transition, extra outbox
event, payment ledger or provider adapter is introduced.

The previous hosted Core `35e12ee` also recorded three restarts around 00:03 Berlin.
Historical logs show administrator-terminated PostgreSQL connections followed by
startup panics in `performance/authority.rs` while connecting the system runtime
pool. Those observations do not identify who initiated database maintenance.

Initial pool connections now retry transient IO, capacity and PostgreSQL shutdown
errors for a bounded 90-second window with capped backoff. Connection URLs and
credentials are not logged. Configuration/TLS/authorization failures are not
classified as transient; the existing role separation, ownership, RLS, privileged
table and signing-authority audits remain in force. This is startup recovery, not
zero-downtime database failover or a retry of uncertain financial writes.

The registered `startup_recovery` fixture starts the actual Core with an initially
refused loopback database endpoint, then restores forwarding to its isolated real
PostgreSQL. The former binary exits; the repaired binary must become ready and
read the native catalog in the same process. Existing restricted-login and unsafe
authority negative tests remain required.

Local result: the forced POS interleaving, complete generic-provider payment
fixture, native POS/receipt/MCP paths and actual database startup recovery pass.
The focused signed-runtime repeat also passes these cases through separately
authenticated tenant/system logins, including strict unsafe-role rejection and
the existing two-replica inventory/session/scope checks. Workspace tests, strict
Clippy and complete documentation checks pass. The failed GitHub result is retained;
the repaired head still requires its own full check before public delivery.
