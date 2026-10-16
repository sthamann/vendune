# Veyndo: current status

This is the single starting point for what works, what is implemented but not
publicly accepted, and what still needs development. Updated 16 October 2026.
A green test, merged code and a completed public business journey are different evidence.

## Start with a complete journey

1. [Create and explore a synthetic shop](first-tour.md).
2. [Build an app and test its real records privately](app-tutorials/README.md).
3. [Review a sandbox and selected publication](workbench.md).
4. [Understand the connected architecture](production-architecture.md).

## Public acceptance

| Journey or boundary | Evidence and present limitation |
| --- | --- |
| Shared app storage | [15 October hosted migration](evidence/shared-app-storage-hosted-2026-10-15.json): four fixed physical tables, checked data migration and simulated purchases. This does not establish unbounded capacity. |
| Restricted database runtime | [Hosted enforcement record](evidence/database-enforcement-2026-10-15.json): separate roles and strict restart. Authorization and SQL isolation are both required. |
| Native checkout | Dated acceptance covers simulated purchases. It does not prove a real provider payment, mail delivery, invoice and refund journey. |
| Storyfront embedded checkout | [16 October original Storyfront acceptance](evidence/storyfront-checkout-2026-10-16.json): embedded contact/address, simulated order RAC-b359e75d, German receipt and cleared original bag passed in a fresh Chrome session. The earlier controlled tab remained paused at about:blank; real provider redirects/3DS remain unaccepted. |
| Browser login | HttpOnly implementation and registered session tests exist. Public Google sign-in, reload and logout passed on 16 October. Fresh SaaS creation and its one-use Studio handoff also passed. Password sign-in still needs its own public acceptance. Apple currently returns `invalid_request: Invalid web redirect url` for the new start.veyndo.ai callback; the Apple Service ID configuration is not repaired. |
| Legacy domains | 16 October public DNS/TLS/redirect checks passed for vendune.ai and team.vendune.ai, ending at www.veyndo.ai and team.veyndo.ai respectively. No DNS change was made. Authoritative-provider configuration and filtering-provider delisting remain separate checks. |
| Recovery and real providers | Restore drill and real payment/mail/refund acceptance require their own recorded outcomes. No current whole-system production certification. |

## Implementation and hardening

| Area | Current boundary | Acceptance required |
| --- | --- | --- |
| Commerce and channels | Native Rust owners for products, prices, stock, checkout, orders, documents, POS and selected B2B/UCP routes | Full relevant role/channel/language/currency flows, including denied cases |
| App storage and lifecycle | Shared bounded records, references, settings, immutable definitions, private previews and selected release | Complete generated business capability across data/UI/logic; no arbitrary-source hosting claim |
| Agent runs | Persisted native task checkpoints, leases, cancellation and explicit uncertain-call continuation | Per-agent identities, enforced spend/token budgets and global emergency stop |
| Provider tools | Native OpenAI Responses/Chat, Claude and Ollama read tool protocols, private conversation continuation and current per-call authorization are deployed in the 16 October Core | Local provider and durable-worker fixture suites passed; real configured provider quality/usage needs separate acceptance |
| Prompt governance | Four central prompts are versioned files with ID, template digest and rendered-system digest in model usage | Versioned prompt IDs and content digests in model evidence, injection evaluation at actual admission |
| Contracts | Compiled operation registry generates request OpenAPI, TypeScript and WIT contracts with drift checks | Input contract generation passes locally; broad domain objects and response DTOs are not yet completely typed |
| Module boundaries | Five real workspace libraries extract kernel, runtime, commerce, apps and provider inference; HTTP/domain composition remains in the root | Compiler checks and dependency-DAG negative controls passed locally; not every domain handler has moved |
| Money | Exact `Money` exists; compatibility calculation paths still contain `f64` | Exact authoritative arithmetic with the original PHP differential gate |
| Outbox | Separate cognition/apps/flows/audit checkpoints and durable request/task/event trace IDs are deployed in the 16 October Core | Actual PostgreSQL poison-audit isolation, other-consumer progress, quarantine, cold restart and explicit replay passed; public migration 103 applied successfully after a fresh snapshot |

## Public delivery and current work

Core image `steep-cushion-339` (`9846807`) and private Experience `b40b386` are
publicly running. [The new hosted receipt](evidence/platform-hardening-hosted-2026-10-16.md)
records migration 103, a fresh SaaS shop with three AI products and generated
images, Studio handoff, a native purchase, the original Storyfront embedded
checkout and cleared original bag, and a privately tested/published furniture app
with a real configured purchase. Payment was simulated throughout.

The release head `7a4388d` changes CI/documentation only relative to that runtime.
Its complete GitHub repeat is still running; the preceding test-orchestration
failure and its correction remain recorded in the receipt. Public testing found
missing configuration detail in generic purchase screens; that separate summary
fix is being verified and is not claimed public here. Full B2B purchasing approval
and current-rule reorder have local connected PostgreSQL evidence, not an extra
hosted acceptance in this receipt.

## Evidence and reference guides

- [Hardening design and owners](platform-hardening.md): architecture detail, not another release status.
- [Historical delivery audit](delivery-audit-2026-10-15.md) and [release record](current-release.md): dated evidence.
- [Testing](testing.md), [formal scope](formal-verification.md), [capacity measurements](benchmarks.md).
- [Changelog](../CHANGELOG.md): implementation notes belong here, not in the README.
