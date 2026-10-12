# Native POS adapters

- `mod.rs`: route/capability registry and private cashier/channel admission.
- `config.rs`: typed channel location/presentation and transactional per-channel
  cash/collection defaults in the existing settings override owner.
- `gateway.rs`: bounded authenticated HTTP/MCP operations; forwards catalog,
  variant, cart, currency, coupon, consent, payment and checkout work to existing owners.
- `schema.rs`: the exact discoverable MCP contract used by coding agents.
- `settlement.rs`: checked minor-unit tender, immutable receipt presentation,
  configuration lock and durable POS events inside existing order/payment transactions.

There is no POS order/payment/document table or independent worker. POS is a native
channel adapter, not an app. App-owned UI, data or business logic must remain in
`extensions/apps/<app>/`; the generic host exposes three permission-bound slots.
`pos.py` exercises real PostgreSQL/HTTP and `payment_providers.py` covers the same
provider ledger through an isolated service fixture. The cash predicate is extracted
to Lean; this does not prove SQL, providers or the entire register.
