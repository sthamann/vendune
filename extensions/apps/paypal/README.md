# PayPal app and compatibility adapter

The package owns its Manifest and `src/` implementation: Orders v2 wire calls,
account/admission mapping, receipt interpretation and webhook signature verification. The payment core
retains its shared attempt ledger, reservations, jobs, receipt policies and remote
provider contract; it references these app-owned files without copying them.

**Execution boundary:** this legacy adapter is still host-native to preserve
already configured PayPal attempts and the existing webhook route. Folder ownership
is not a sandbox. New providers use the generic remote payment contract and a
separate approved service; private Shopware Payments remains in its private repo.
Do not mark this compatibility bridge as a sandboxed third-party Rust runtime.
A complete remote cutover needs a migration of existing attempts and provider
configuration, plus signature/reconciliation compatibility.

Run the registered `payments` suite for local OAuth/order/capture/refund/webhook
fixtures, including restart/idempotency and exact amount binding. It does not
charge money or prove a configured live merchant account.
