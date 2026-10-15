# Workspace and visual storefront evidence — 15 October 2026

These are real Chrome captures of the branch implementation, using an isolated
local PostgreSQL fashion shop (`visual-atelier`). They are not production screenshots.
All people, addresses and credentials in the fixture are synthetic. No paid model,
payment provider, external email or CRM service was called.

| Capture | Observed path |
| --- | --- |
| `workspace.jpg` | Saved personal work area, movable cards, pinned view and goal |
| `designer.jpg` | Private sandbox, shared storefront renderer, page tree and property inspector |
| `storefront.jpg` | The same page after selective native publication |
| `mobile.jpg` | Actual 390 × 844 viewport; document width 390 px |
| `checkout.jpg` | Native review reached through the designed page's product action |
| `checkout-mobile.jpg` | Native checkout at 390 × 844; document width 390 px |
| `completion.jpg` | Simulated order RAC-ac26aa35, 169 EUR; cart cleared |

The browser journey changed the German hero in the sandbox, saved it, selected
only the page in native publication, opened the released shop, added a product,
and completed a simulated order. The released page and order survived a native
server restart. A published form was separately submitted in Chrome and its
answer read in the permission-protected native Studio inbox. A personal goal
opened an inactive Flow draft with its title/instruction in the shop main language.

Verification on this branch: 507 frontend tests; 245 Rust tests; Clippy, formatting,
ownership, localization, source inventory and API gates; the registered
`visual_workspace` HTTP/PostgreSQL/provider fixture; existing staging, apps,
consent, tenant, role, accounts, checkout, commerce and production-foundations
regressions. The initial combined run exposed an incorrect test expectation
(`done` instead of the native `completed` state); after correcting that assertion,
the complete affected `visual_workspace` suite passed again.

The extracted intake predicate passed Lean/conformance; 161 intentionally broken
policies were rejected. This proves that bounded predicate, not SQL, UI behavior,
model design quality or the entire commerce system. Independent focused security
review found no remaining concrete blocker after the authorization, history,
publication, lock-order and safe-pin corrections.

These results do not certify public deployment, real-model visual quality,
provider settlement, full editorial CMS parity or autonomous whole-business work.
