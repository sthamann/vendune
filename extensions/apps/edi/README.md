# EDI procurement app

Owns codecs, mappings, Manifest/UI and tests. Native companies, prices, checkout,
orders and issued receipts remain Core-owned; no app code is installed into Core.
See [setup, document profiles and explicit limits](../../../docs/edi.md).

| File | Responsibility |
| --- | --- |
| `manifest.json` | Private partner/message/input schema, native tenant references, localized UI and API/MCP/Flow service actions. |
| `service/main.rs`, `config.rs`, `callbacks.rs` | Independent Rust gateway, bounded admission, fixed tenant callback origins and scoped approved credentials. |
| `service/document.rs`, `edifact.rs`, `xml.rs` | Bounded normalized document model and untrusted syntax parsing. |
| `service/import.rs` | Active partner match, native private requisition and durable app receipt idempotency. |
| `service/export.rs`, `export_tests.rs` | Native immutable receipt/order serialization and parser/escaping counterexamples. |
| `tests/integration.py` | Isolated real Core/PostgreSQL+gateway import → buyer checkout → native document export and restart/revocation tests. |
| `Dockerfile` | Non-root Rust-only production gateway, built from repository-root context. |

## Operator configuration

- `APP_BIND_ADDR=127.0.0.1:8798` (use `0.0.0.0:8798` inside the service container).
- `APP_TOKEN`: strong gateway bearer credential, at least 24 characters; never in a Manifest/UI.
- `APP_ID=edi`: must equal the installed/cloned package ID; lowercase letters, digits and underscores, max 32 characters.
- `APP_EDI_TENANTS`: JSON object keyed by exact native tenant ID, with `coreUrl` (fixed origin ending `/`) and `callbackToken` (approved app callback token). Example shape only:

```json
{"your-tenant":{"coreUrl":"https://app.sellm.ai/","callbackToken":"SERVER_SECRET_PLACEHOLDER"}}
```

Register the endpoint and gateway token through the existing server-side
`APP_SERVICES` configuration. Do not expose this port as an unauthenticated inbound
EDI gateway. A configured transport would authenticate the partner first, then
invoke the same admitted app action. The existing service gateway exposes read-only
`validate_document` / `export_document` and effectful `import_document` separately.

Docker: `docker build -f extensions/apps/edi/Dockerfile .`. First-party runtime
has no Python. Python tests run only in development/CI. No new hosted service or
paid transport is provisioned automatically by this package.
