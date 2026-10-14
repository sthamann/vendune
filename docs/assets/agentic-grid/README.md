# Agentic grid captures

Captured in Chrome on 14 October 2026 from the actual local Veyndo frontend and
Rust API, using `scripts/grid_directory.py`'s isolated PostgreSQL review fixture.
All names, email addresses and orders shown are synthetic; no merchant password,
session token or real customer information is present.

The order records were created through Store API checkout. The AI preview uses a
loopback model fixture behind the real central model adapter and Rust planning
route, not a live paid provider. Screenshots are not a performance measurement or
a claim that every natural-language request is understood by a particular model.

| File | Demonstrated state |
|---|---|
| `orders-en.png` | Shared native order directory, light appearance |
| `columns-en.png` | Select/reorder columns, density and close control |
| `ai-preview-en.png` | Explicit filter review before native execution |
| `orders-dark-en.png` | Same directory in dark appearance |
| `orders-mobile-en.png` | Applied customer filter at 390 × 844 |
| `mobile-columns-en.png` | Contained touch controls at 390 × 844 |
| `products-en.png` | Native category filter over products |
| `customers-en.png` | Registered customer directory and translated group label |

The temporary viewport override was reset after capture. The isolated review
database is disposable. Recreate it with `GRID_REVIEW_HOLD=1` when new captures
are needed; never use production customer data or expose its private fixture file.

`native-contract.svg` is a script-free static sequence drawing laid out from the
validated `native-contract.json`; equivalent editable Mermaid source is
`native-contract.mmd`. The Mermaid tool statically validates/exports that source.
The SVG uses distinct lifelines for all six owners and native SVG arrows. It depicts owner/message relationships, not
measured timings. It is served as an ordinary image so the documentation needs
no remote renderer or executable diagram code. Static lint is not a semantic
proof or evidence that a specific Mermaid renderer was used.
