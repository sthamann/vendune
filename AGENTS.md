# Changes to Veyndo

Prefer the codebase-memory MCP graph for structural code discovery. Keep Rust
modules small and give every source file a responsibility comment; the existing
structure check is mandatory.

## Understand the existing architecture before extending it

Read [the source map](docs/source-map.md) for module ownership and
[Rust services and language boundaries](docs/rust-services.md) for the actual
service, queue and migration contracts. Follow the existing call path from the
frontend/API/MCP/flow entry point to its production consumer before changing it.
These documents describe one connected system, not alternative implementations.

| Existing owner | Responsibility / entry points |
| --- | --- |
| Rust commerce binary | `src/main.rs` is process entry only; domain modules own commerce operations. Store/Admin APIs, MCP and implemented UCP routes reuse those operations, permissions and tenant checks. |
| Rust connector binary | `src/bin/connectors.rs` and `extensions/services/connectors/src/` own shared hosting; provider implementation belongs to the respective `extensions/apps/<app>/` package. This is a separate service reached through the permission-aware app gateway, not provider code embedded in checkout. |
| Frontend | `frontend/src/` contains modular Studio/storefront clients of the existing APIs. Keep provider credentials and privileged gateway tokens server-side. |
| Durable state and events | PostgreSQL owns commerce state, connector configuration and queues. Commerce outbox/Flow Builder events reach the connector through the existing app action/event contract. Qdrant supplies knowledge vector retrieval, not a second commerce ledger. |
| External extensions | The language-neutral app gateway and documented extension contracts support independent services. Private Payments and Storyfront/Experience implementations stay in their separate repositories. |

Do not create a parallel mailer, queue, settings store, pricing engine, provider
registry, MCP command implementation or commerce API to avoid understanding an
existing module. Extend its owner and shared contract. For example, order email
delivery follows **Rust checkout → PostgreSQL outbox → Flow Builder → app gateway
→ Rust connector → PostgreSQL delivery queue → provider**. Preserve its tenant
identity, permissions, idempotency, quotas, lease fences and uncertainty handling;
do not add direct SMTP calls to checkout or a Python fallback worker.

Money/currency resolution already belongs to `src/currencies/` and the shared
commerce calculation path; API/MCP/UI consumers must not implement their own FX
calculator. See [multi-currency commerce](docs/currencies.md). A protocol adapter
translates inputs/outputs; it does not become a second owner of business rules.

Product editing preserves aggregate `revision` for legacy/absolute-stock CAS and
uses `contentRevision` only when `commerce.stock` is omitted. Never infer that an
echoed old quantity is a new inventory instruction. The editor omits untouched
stock and adopts the returned current quantity/clocks. Migration 098 observes
existing revisioned writers during rolling releases. Keep both clocks and stock
out of sandbox configuration digests; history restoration never restores stock.
See `docs/product-management.md#editing-while-orders-arrive` and retain the actual
two-replica purchase/cancellation/MCP regression in `production_foundations`.

## Internationalization contract (mandatory for every new module)

- Every customer/merchant-facing field (including shipping/payment names and descriptions,
  tax labels, country/region names, product names, SEO, rich descriptions and category content)
  must accept enabled shop content languages. Do not hard-code four product languages.
- Content editors must use `shared/i18n/ContentLanguage`, `ContentLanguagePicker` and
  `LocalizedField` (or `shared/geography/TranslationFields` for object maps). One
  selected content language applies to the entire editor, including nested flow
  nodes. Do not render separate text inputs/areas for every language. The localization
  gate rejects stacked language value fields; keep its negative controls passing.
- Use the shop's `mainLocale` as the per-field fallback. `null`/missing means inherit;
  an explicitly empty description must remain empty. Never save inherited values as
  fabricated translations or silently copy names into every language.
- All new interface text and bundled content ships in English, German and Spanish;
  preserve French where supported. Use typed shared vocabulary modules, never raw JSX
  text/labels. `npm run localization` is required in CI. No legacy literal baseline
  or record-legacy bypass is allowed. Conditional/fallback/template copy, local
  string bindings and display props also belong in vocabularies. The explicit
  `localization-tokens.json` list is only for proper names, protocol identifiers,
  units and artwork lettering; never add interface prose to silence a failure.
- Preserve every `{parameter}` in all translations. Use `npm run translations`
  to export/import existing typed catalogues; imports validate all keys/locales
  before writing string literals. See [the translation guide](docs/localization.md).
- External app hosts pass interface/content/main locales and enabled languages.
  Guest apps use `sdk.uiText` for controls and `sdk.text` for merchant content;
  native and product-slot apps use the same main-language fallback. Do not slice
  a locale and hard-code English as a content fallback. Verify a non-English-main
  shop and a fifth content language; arbitrary third-party UI needs its own checks.
- Reuse `shared/geography` search/group pickers for country or region selection.
  Country checkbox walls and unvalidated free-text subdivision IDs are prohibited.
- Newly enabled delivery countries require explicit tax configuration and valid shipping
  and consumer payment coverage. Do not invent tax law or automatically set new countries
  to a zero tax rate. Destination conditions run through the existing native Rule Builder.
- Translation/model output is untrusted. Preserve URLs, IDs, units, media and document
  structure; validate content, tenant permissions and expected revisions on apply.
  Bulk operations must persist progress and process bounded batches. Test inheritance,
  a non-English main language, tenant isolation, stale versions and provider failures.

## First-party service language boundary

**Bundled production commerce and standard provider services run in Rust.**
Python remains for development tools, tests, documentation, the explicit one-time
legacy-data migration and independent example apps. Its presence in the repository
does not make it a supported first-party production runtime.

| Python location / purpose | Allowed boundary |
| --- | --- |
| Verification, differential tests, source/coverage checks and site generation | Development/CI tools only; never required to serve a commerce request or deliver a notification. |
| `scripts/connectors.py` | Local lifecycle tooling that launches the compiled Rust connector; it is not the email/provider implementation. |
| `scripts/migrate_connector_state.py` | Explicit offline reader for the old SQLite/Fernet data. Stop the old worker and preserve its backup/key first; pipe records to Rust `connectors --import-legacy`, which validates and atomically re-encrypts/imports into PostgreSQL. Never import automatically during normal startup. |
| `scripts/mcp_stdio.py` | Optional client-side JSON-RPC bridge. The hosted `/mcp` server and its commerce operations run in Rust; no hosted Python MCP backend. |
| `reference/connectors-python/` | Archived comparison implementation for differential fixtures and migration understanding. Do not resurrect, import into serving code or package it as a production service. |
| Independent Product Lab / service-example / third-party apps | Deliberately language-independent extension examples, reached through extension contracts. They must not become a required dependency of the core or bundled standard services. |

The final runtime stages of `deploy/Dockerfile` (commerce) and
`extensions/services/connectors/Dockerfile` (standard services) contain **no Python
interpreter**. Keep this boundary when changing images or startup commands: no
Python installation, `.py` entry point, runtime Python subprocess, archived worker
or fallback provider implementation in either production image. Build/CI tools
and optional independent app images are separate scopes.

The former `email_config.py`, `email_templates.py`, `email_service.py` and
`email_delivery.py` are reference code, not current service owners. Configuration,
templates and delivery belong to `extensions/apps/email/src/`; shared actions and queues belong to `extensions/services/connectors/src/`; use the
module table in [the Rust service guide](docs/rust-services.md) to find each owner.
Do not introduce SQLite, a filesystem spool or process-local authoritative queues
beside the PostgreSQL connector queue. Preserve forced tenant RLS, the dedicated
non-owner production role, encrypted credentials, bounded worker admission and
explicit handling of uncertain external sends.

For a runtime extension or port:

1. Identify the existing module, API/app contract, event producer and actual consumer.
2. Extend the Rust owner while keeping API, MCP, flow and frontend contracts aligned.
   External apps can keep their own language; do not pull them into the public core.
3. For persisted legacy data, document the explicit backup, stop, import and cutover
   path. Never run old and new dispatchers simultaneously against the same workload.
4. Verify the real path with isolated PostgreSQL tenants and local provider fixtures.
   Use the registered `rust_connectors` / `email_tests` suites when changing these services;
   preserve the original comparison fixtures, concurrency and migration checks.
5. Update module ownership and service documentation. Check the final runtime image
   and startup path, not merely whether Rust code exists or unit tests pass.


## Scoped ownership rules

Read the matching directory AGENTS.md before changing its owner; cross-directory
work must read every affected owner. Backend work follows `src/AGENTS.md`, frontend
work follows `frontend/AGENTS.md`, app/service work follows `extensions/AGENTS.md`.
Nested rules refine ownership; they never relax root security or runtime contracts.
For changes spanning API, models and UI, trace the shared production consumer first.

| Owner | Additional instructions |
| --- | --- |
| `src/cognition/` | [src/cognition/AGENTS.md](src/cognition/AGENTS.md) |
| `src/` | [src/AGENTS.md](src/AGENTS.md) |
| `src/apps/` | [src/apps/AGENTS.md](src/apps/AGENTS.md) |
| `extensions/` | [extensions/AGENTS.md](extensions/AGENTS.md) |
| `src/b2b/` | [src/b2b/AGENTS.md](src/b2b/AGENTS.md) |
| `extensions/apps/marketplaces/` | [extensions/apps/marketplaces/AGENTS.md](extensions/apps/marketplaces/AGENTS.md) |
| `src/auth/` | [src/auth/AGENTS.md](src/auth/AGENTS.md) |
| `frontend/` | [frontend/AGENTS.md](frontend/AGENTS.md) |
| `src/capabilities/` | [src/capabilities/AGENTS.md](src/capabilities/AGENTS.md) |
