# slack app

Validated Slack channel notifications and delivery fencing.
App-owned Rust modules live in `src/` beside the Manifest; frontend bridges,
when present, live in this package too. The shared connector service imports them
at build time and runs separately from the commerce process. Installation never
copies implementation files into general system source folders.

Common encrypted state, authentication, network policy, OAuth, job admission and
leased workers belong to [the connector host](../../services/connectors/src/README.md).
These trusted first-party network adapters are admitted through the app gateway;
they are not unrestricted merchant-uploaded Rust code. Merchant-authored native
apps use the existing bounded declarative/Wasm or approved external-service paths.
Provider credentials remain server-side. Keep permission consent and uncertain
external-result handling intact. See [isolation](../../../docs/app-security.md).

Verification uses the registered `rust_connectors` and `email_tests` suites with
local HTTP/SMTP fixtures and isolated PostgreSQL tenants, never real sends.
