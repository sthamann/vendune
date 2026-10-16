# Veyndo: current status

This is the single starting point for what works, what is implemented but not
publicly accepted, and what still needs development. Updated 17 October 2026.
A green test, merged code and a completed public business journey are different evidence.

## Start with a complete journey

1. [Create and explore a synthetic shop](first-tour.md).
2. [Build an app and test its real records privately](app-tutorials/README.md).
3. [Review a sandbox and selected publication](workbench.md).
4. [Understand the connected architecture](production-architecture.md).

## Public acceptance

| Journey or boundary | Evidence and present limitation |
| --- | --- |
| Native app product journey | [17 October hosted acceptance](evidence/native-app-fields-hosted-2026-10-17.md): visual creation, native product writes, compatible upgrade with retained data, optional grid column, exact positive/negative filters and selected live publication passed. Original embedded Storyfront purchase/return/bag clearing also passed on that image; payment remained simulated. |
| Shared app storage | [15 October hosted migration](evidence/shared-app-storage-hosted-2026-10-15.json): four fixed physical tables, checked data migration and simulated purchases. This does not establish unbounded capacity. |
| Restricted database runtime | [Hosted enforcement record](evidence/database-enforcement-2026-10-15.json): separate roles and strict restart. Authorization and SQL isolation are both required. |
| Native checkout | Dated acceptance covers simulated purchases. It does not prove a real provider payment, mail delivery, invoice and refund journey. |
| Storyfront embedded checkout | [16 October original Storyfront acceptance](evidence/storyfront-checkout-2026-10-16.json): embedded contact/address, simulated order RAC-b359e75d, German receipt and cleared original bag passed in a fresh Chrome session. The earlier controlled tab remained paused at about:blank; real provider redirects/3DS remain unaccepted. |
| Browser login | HttpOnly implementation and registered session tests exist. Public Google sign-in, reload and logout passed on 16 October. Fresh SaaS creation and its one-use Studio handoff also passed. Public password sign-in, reload persistence, logout and denied protected-route return also passed in a separate incognito session on 16 October. Apple currently returns `invalid_request: Invalid web redirect url` for the new start.veyndo.ai callback; the Apple Service ID configuration is not repaired. |
| Legacy domains | 16 October public DNS/TLS/redirect checks passed for vendune.ai and team.vendune.ai, ending at www.veyndo.ai and team.veyndo.ai respectively. No DNS change was made. Authoritative-provider configuration and filtering-provider delisting remain separate checks. |
| Recovery and real providers | Restore drill and real payment/mail/refund acceptance require their own recorded outcomes. No current whole-system production certification. |

## Implementation and hardening

| Area | Current boundary | Acceptance required |
| --- | --- | --- |
| Commerce and channels | Native Rust owners for products, prices, stock, checkout, orders, documents, POS and selected B2B/UCP routes | Full relevant role/channel/language/currency flows, including denied cases |
| App storage and lifecycle | Shared bounded records, references, settings, immutable definitions, private previews and selected release | Complete generated business capability across data/UI/logic; no arbitrary-source hosting claim |
| Agent runs | Persisted native task checkpoints, leases, cancellation and explicit uncertain-call continuation. Publicly deployed [planning-agent controls](agent-authority-controls.md) add distinct revocable keys, exact-model allocation envelopes and live/sandbox stop. | [Hosted stop/re-enable and shopping acceptance](evidence/agent-authority-hosted-2026-10-16.md); conservative token/USD allocations are not provider invoices or unrestricted financial autonomy. |
| Provider tools | Native OpenAI Responses/Chat, Claude and Ollama read tool protocols, private conversation continuation and current per-call authorization are deployed in the 16 October Core | Local provider and durable-worker fixture suites passed; real configured provider quality/usage needs separate acceptance |
| Native app extensions | [Version-1 private product/customer/order/company fields](app-core-extensions.md) integrate native details, existing grids, exact filters, current permissions and selected configuration release | [17 October hosted product lifecycle](evidence/native-app-fields-hosted-2026-10-17.md) passed; all four object types have local/required-CI coverage, not four separate hosted walkthroughs |
| POS status and database recovery | [Reproduced read-race and startup repairs](evidence/startup-pos-recovery-2026-10-17.md) keep payment/order snapshots coherent and retry transient initial database connections | Deterministic regressions and full required CI passed; repairs are deployed in the [17 October image](evidence/native-app-fields-hosted-2026-10-17.md). No induced production outage, failover or uncertain-write retry claim |
| Prompt governance | Central prompts are versioned files with ID, template digest and rendered-system digest in model usage | Versioned prompt IDs and content digests in model evidence, injection evaluation at actual admission |
| Contracts | Compiled operation registry generates request OpenAPI, TypeScript and WIT contracts with drift checks | Input contract generation passes locally; broad domain objects and response DTOs are not yet completely typed |
| Module boundaries | Five real workspace libraries extract kernel, runtime, commerce, apps and provider inference; HTTP/domain composition remains in the root | Compiler checks and dependency-DAG negative controls passed locally; not every domain handler has moved |
| Money | Exact `Money` exists; compatibility calculation paths still contain `f64` | Exact authoritative arithmetic with the original PHP differential gate |
| Outbox | Separate cognition/apps/flows/audit checkpoints and durable request/task/event trace IDs are deployed in the 16 October Core | Actual PostgreSQL poison-audit isolation, other-consumer progress, quarantine, cold restart and explicit replay passed; public migration 103 applied successfully after a fresh snapshot |

## Public delivery and current work

The current Core is `f627f9d`, image `right-increase-7968`, source-tree equivalent
to merged main `be4d6cf`. Its [17 October receipt](evidence/native-app-fields-hosted-2026-10-17.md)
records full required CI, fresh snapshot, successful migration/readiness, the public
product-extension lifecycle and selected publication, and original embedded
Storyfront order **RAC-9f0f00ad** with return and cleared original bag. Payments
remained simulated. The private Experience service remains `b40b386`.

The [planning-agent release receipt](evidence/agent-authority-hosted-2026-10-16.md)
records Core `dac31fa`, image `foamy-passenger-5421`, fresh snapshot and migration 104.
Public stop/re-enable, native shopping during stop, a fresh SaaS shop with three AI
products/images, password-session lifecycle and the original Storyfront embedded
purchase/return/empty-bag flow passed. Payments remained simulated. The frontend
admission-message follow-up `8b461a1` is also deployed as `bustling-bulb-1104`: a second fresh
snapshot, successful migration, healthy Core and public explicit German stop/recovery message
passed. The test stop was lifted again. Older releases below retain their own source boundaries.

The preceding presentation follow-up was Core `35e12ee`, image `thankful-name-8063`.
Its fresh snapshot, successful migration and 1/1 healthy start passed. Public
stop/re-enable and the corrected connected empty-product preview passed. Its
required frontend CI repeated 628 tests with unchanged coverage floors; the
underlying backend remains identical to the full agent-admission release above.

Earlier Core image `mirthful-zipper-2487` (`c70f246`) and private Experience `b40b386`
were the preceding public acceptance. [The new hosted receipt](evidence/platform-hardening-hosted-2026-10-16.md)
records migration 103, a fresh SaaS shop with three AI products and generated
images, Studio handoff, a native purchase, the original Storyfront embedded
checkout and cleared original bag, and a privately tested/published furniture app
with a real configured purchase. Payment was simulated throughout.

The hardening baseline `9846807` was runtime-equivalent to its reviewed release
head `7a4388d`; the later configuration-summary image adds the separately tested
follow-up. Final merged main includes that fix and the translated explicit
workspace-module recovery; the fresh snapshot and migration/readiness chain passed.
Its [complete required GitHub repeat](https://github.com/sthamann/veyndo/actions/runs/38926129994)
passed and PR 143 merged as `1725369`; the preceding test-orchestration failure
and its correction remain recorded in the receipt. The [configuration-summary follow-up](evidence/configuration-summary-hosted-2026-10-16.md)
is now separately deployed: checkout, confirmation and merchant order retain
material, dimensions and accepted surcharge on public simulated order RAC-75415aa4.
The final pinned-image original Storyfront purchase also passed in native Chrome
(RAC-08a6f8d0), including return and original bag clear. Earlier Safari/Chrome
comparisons and the intervening main-release replacements retain separate source
boundaries in the receipt.
Tab-debug-controlled blank repeats are preserved separately in the receipt.
Its [full required follow-up CI repeat](https://github.com/sthamann/veyndo/actions/runs/38931681426)
passed and PR 144 merged as `deb452d`. Full B2B purchasing approval
and current-rule reorder have local connected PostgreSQL evidence, not an extra
hosted acceptance in this receipt.

## Evidence and reference guides

- [Hardening design and owners](platform-hardening.md): architecture detail, not another release status.
- [Historical delivery audit](delivery-audit-2026-10-15.md) and [release record](current-release.md): dated evidence.
- [Testing](testing.md), [formal scope](formal-verification.md), [capacity measurements](benchmarks.md).
- [Changelog](../CHANGELOG.md): implementation notes belong here, not in the README.

The earlier configuration/workspace release repeated 618 frontend tests with unchanged coverage
gates. The later agent-admission release repeated 627 frontend tests in full CI; its own source and public results are recorded above. Public offline/reload recovery preserved the session. The module-specific
message is covered by actual lazy-load failure tests; a public asset-blocking
attempt did not reproduce that precise failure and is not counted as acceptance.
