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
| Native app workflows and AI proposals | [17 October public acceptance](evidence/native-app-workflows-hosted-2026-10-17.md): visual creation, private installation, selected publication, guarded completion, 0.1.1 → 0.1.2 upgrade and distinct old/new order workflows passed. The [configured-model follow-up](evidence/agent-native-workflows-hosted-2026-10-17.md#follow-up-accepted-on-d939257) also passed exact preservation, private install and selected publication of a missing quote workflow. Payments remained simulated; hosted RFQ buyer execution is a separate acceptance. |
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

The current Core is `e9369cf`, image `cool-grape-9915`, source-tree identical
to merged main `97c981f`. Its [UI-caption receipt](evidence/agent-native-workflows-hosted-2026-10-17.md#ui-caption-follow-up-accepted-on-e9369cf) records 641 frontend tests, successful maintenance/readiness and live native quote captions. Rust, schema and runtime contracts are unchanged from the fully tested `d939257` backend. The [release and configured-model receipt](evidence/agent-native-workflows-hosted-2026-10-17.md#follow-up-accepted-on-d939257)
records full required CI, snapshot, successful maintenance/readiness and preserved
merchant sign-in. The original natural-language request now produced a valid
0.1.3 quote-review proposal through the configured model. Direct package comparison
preserved the old order contract and every data/UI/access section. Explicit private
installation and selected publication passed; the old order remained unchanged.
The prior two public refusals retain their earlier image and evidence.
The [preceding native order receipt](evidence/native-app-workflows-hosted-2026-10-17.md)
retains its guarded purchases and old/new workflow versions. This release did not
redeploy the private Experience service or newly accept the original embedded
Storyfront checkout; earlier results retain their own source boundary.

Earlier deliveries retain their source and acceptance boundaries:
[product fields and original embedded checkout, 17 October](evidence/native-app-fields-hosted-2026-10-17.md),
[agent authority, 16 October](evidence/agent-authority-hosted-2026-10-16.md),
[configuration summaries](evidence/configuration-summary-hosted-2026-10-16.md),
[platform hardening](evidence/platform-hardening-hosted-2026-10-16.md) and
[Studio release](evidence/studio-release-hosted-2026-10-16.json).

## Evidence and reference guides

- [Hardening design and owners](platform-hardening.md): architecture detail, not another release status.
- [Historical delivery audit](delivery-audit-2026-10-15.md) and [release record](current-release.md): dated evidence.
- [Testing](testing.md), [formal scope](formal-verification.md), [capacity measurements](benchmarks.md).
- [Changelog](../CHANGELOG.md): implementation notes belong here, not in the README.
