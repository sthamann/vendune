# Native company procurement

This domain extends the existing customer/cart/checkout owners. Protocol codecs,
partner adapters and transport must stay in `extensions/apps/<app>/`.

| Module | Owner / contract |
| --- | --- |
| `mod.rs`, `gateway.rs` | One strict command contract for merchant HTTP, customer HTTP and MCP. Current identity determines authority; arguments cannot grant access. |
| `model.rs`, `organization.rs` | Companies, non-cyclic unit hierarchy, cost centers, CAS policies, current employee grants and localized names. |
| `access.rs`, `catalog.rs` | Current customer-session/member checks, native unit product selection and SQL-before-pagination catalog admission. |
| `purchase.rs`, `approval.rs` | Exact currency-unit budgets, serialized allocation/release and approvals bound to the current native quote and policies. |
| `quotes.rs`, `quote_contract.rs` | RFQ/messages, merchant offers and original-cart acceptance; prices feed native currency/tax calculation. |
| `lists.rs`, `quick_order.rs`, `requisition.rs` | Owned/shared purchasing lists, SKU resolution and explicitly mapped app imports; no second checkout. |
| `staging.rs` | Configuration-only clone/snapshot and parent-first selected release through the same organization/catalog transactional writers; no employee or financial rewind. |
| `orders.rs` | Explicit unit-order right, existing customer-safe projection and immutable native receipt PDFs. |

Migration 080 owns composite tenant references, forced RLS and audit snapshots.
The shared checkout takes the unit lock before product locks, then checks current
policy/approval and records spending in the same order transaction. Cancellation
releases the allocation through the shared state machine. Parent units organize
access; they do not silently aggregate budgets or grant inherited employee rights.

`b2b.read` and `b2b.manage` are merchant permissions. Employee permissions are
separate current unit grants: `buy`, `approve`, `lists`, `quotes`, `companyOrders`.
Employee administration additionally requires `customers.write`; company detail
requires `customers.pii`. Apps need separately approved manifest/key permissions.

Regression: `scripts/b2b.py`, `scripts/tenant_isolation.py`, app callback/surface
suites, frontend B2B units and the extracted budget/approval Lean policies. These
do not prove SQL/async correctness or complete B2B-suite equivalence.

Company/unit Studio and HTTP/MCP history delegate to the shared history owner. Configuration restoration preserves current catalog/grants/spending; staging separately publishes reviewed catalog selection. Native method/currency dependency guards protect policy references.

UCP checkout uses these same quote and approval operations via `src/ucp/`; `quote.get`/`quote.current` recheck original-cart ownership and current membership. See [UCP negotiation contract](../../docs/b2b-ucp-negotiation.md). The extension does not create another B2B ledger.
