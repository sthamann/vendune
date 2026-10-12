# Behavioral knowledge workspace

`BehaviorView` requests the native channel/window report. `BehaviorGraph` projects
coarse browser groups, current products and confirmed semantic intents. Products
use the existing Studio navigation. `BehaviorJourney` renders permission-gated
native customer/order links; customer references use the canonical CRM email key.
`types.ts` declares bounded native read projections. Styles live in
`admin/styles/behavior.css`; typed EN/DE/FR/ES vocabulary in `behavior-i18n.ts`.

Reports are aggregate reads; private timelines require current `customers.pii`.
No client identity, event ledger or commerce calculation is owned here. Scope changes
invalidate pending report/journey results. Tests: `tests/unit/behavior.test.tsx` and
registered actual-PostgreSQL `scripts/behavior_intelligence.py`. See
`docs/behavior-intelligence.md` for consent, retention and geographic boundaries.
