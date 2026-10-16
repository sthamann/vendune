# src/b2b ownership

Root AGENTS.md also applies. Rules below were moved from the root, not weakened.

## B2B and EDI ownership

`src/b2b/` owns native company/unit grants, private catalog admission, purchasing
policies, approved quote/list contracts and serialized checkout spending. Reuse
shared money/tax, checkout, inventory, document, audit and outbox owners. Do not
implement an EDI pricing ledger or purchase automatically as a mapped customer.
EDIFACT/UBL/cXML codecs, partner profiles, transport and app UI stay entirely under
`extensions/apps/edi/` or another app package. App callbacks require the current
approved digest/key and creator rights; immutable receipt export requires explicit
orders/documents/PII consent. Keep bounded-profile, no-network-certification limits
visible until corresponding official validation/transport acceptance exists.
See `docs/b2b-commerce.md`, `docs/edi.md` and `src/b2b/README.md`.

`src/ucp/` is a transport adapter only. Its `ai.veyndo.app.shopping.b2b_negotiation` extension invokes the existing `b2b.*` quote/approval owners. Keep merchant offers and buyer acceptance separate; retain current customer membership, original cart/currency/expiry and both CAS revisions. Platform profiles establish compatibility, never identity or permissions. Reuse the shared public HTTPS egress client for bounded profile reads; never forward secrets or allow private DNS/redirects. Do not introduce another quote store, approval engine, FX calculator or outbox. The detailed versioned contract is `docs/b2b-ucp-negotiation.md`; RFQs/approvals/spent budgets remain operational, never staged configuration.

