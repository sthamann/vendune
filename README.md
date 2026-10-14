<p align="center">
  <img src="docs/brand/veyndo-readme.svg?v=blue-20261014" alt="VEYNDO — Commerce that thinks and acts." width="100%">
</p>

<div align="center">

# VEYNDO

**Commerce that thinks and acts.**

[![Verify](https://github.com/sthamann/veyndo/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/sthamann/veyndo/actions/workflows/verify.yml)
[![Documentation](https://github.com/sthamann/veyndo/actions/workflows/pages.yml/badge.svg?branch=main)](https://sthamann.github.io/veyndo/docs/)
[![Working prototype](https://img.shields.io/badge/status-working_prototype-171B18)](#current-boundaries)
[![Sustainable Use License](https://img.shields.io/badge/license-Sustainable_Use-60751C)](LICENSE)

[Get started](#get-started) · [Watch the tours](#see-it-in-action) · [Feature guide](docs/features.md) · [Architecture](docs/production-architecture.md) · [Documentation](https://sthamann.github.io/veyndo/docs/)

</div>

**An AI-first commerce foundation in Rust, built for people and agents.**
VEYNDO connects business knowledge, commerce operations, typed apps and experiences.
Agents work with the same products, prices, inventory and permissions that people
use in Studio and the storefront. People decide what agents may read, propose and
execute.

Self-hostable and source-available. A working prototype with explicit boundaries;
continuous autonomous business optimization remains a development goal.

## One connected business

| Foundation | What you can do |
| --- | --- |
| **Commerce** | Manage products, variants, customers, orders, currencies, taxes, shipping, payments and documents through shared native operations. |
| **Intelligence** | Connect private and published sources, inspect retrieval, review proposals and set limits for bounded autonomy. |
| **Agents** | Expose authorized HTTP/MCP actions and scoped UCP checkout paths using the same ownership and revision checks. |
| **Experiences** | Build storefronts and connected experiences for human shoppers while keeping machine access tied to authoritative commerce data. |
| **Apps & automation** | Design typed apps visually or with coding agents, test real records privately and run durable event-driven Flows. |
| **Agentic grids** | Search, filter and sort orders/products/customers, arrange columns and review natural-language filter suggestions through the same native APIs. [Guide](docs/agentic-grids.md). |
| **Control** | Use team permissions, private sandboxes, selected releases, version history and central model settings. |

[![The VEYNDO Studio with its approved Living V identity](docs/assets/veyndo-studio-en.jpg)](docs/ui-experience.md)

## Get started

**Rust stable 1.96+ · Node.js 22+ · Docker Compose · Python 3**

```sh
git clone https://github.com/sthamann/veyndo.git
cd veyndo
./scripts/dev.sh
```

Open [the storefront](http://127.0.0.1:8787/) or
[VEYNDO Studio](http://127.0.0.1:8787/#merchant). Choose **Create shop** to create
your owner account and a separate shop. The included Nord Atelier fashion demo,
variants, bag and simulated checkout work without a model download or provider key.

Try one complete round: select a coat size → place a simulated order → inspect it
in Studio → create a sandbox → change a product → review the selected release.

The first start builds the application and starts PostgreSQL/Qdrant. Credentials
are generated in ignored `.env`. Keep the terminal open; Ctrl+C stops the app and
retains the database. [Setup and troubleshooting](docs/quickstart.md).

<details>
<summary><strong>Add intelligence or connect an agent</strong></summary>

- Configure Ollama, OpenAI Responses or Anthropic Messages centrally. Cloud charges
  and API credentials are separate from consumer chat subscriptions.
  [Model setup](docs/connectors.md#models-inside-the-merchant-chat).
- Connect a local MCP client. Hosted clients additionally need a reachable HTTPS
  endpoint and client-side registration; OAuth clients need an appropriate gateway.
  [Agent connections](docs/connectors.md#claude-desktop--local-mcp-clients).
- Run another instance with separate ports, credentials and volumes.
  [Independent development instance](docs/quickstart.md#run-a-separate-development-instance).

</details>

## See it in action

Fresh VEYNDO captures use an isolated synthetic shop. Payments are simulated;
recordings are edited for readability and are not latency measurements.

[![Nord Atelier storefront](docs/assets/showcase/storefront.webp)](docs/features.md#storefront-and-shopping)

**Connected knowledge:** inspect source ownership, review a demonstration source
and keep autonomy limits visible. Retrieval is distinct from model-weight training.
[Watch](docs/assets/showcase/connected-intelligence.mp4) · [Knowledge guide](docs/knowledge-workspace.md).

[![Knowledge and explicit boundaries](docs/assets/showcase/connected-intelligence.webp)](docs/assets/showcase/connected-intelligence.mp4)

**App Studio:** visual controls and coding agents share one executable manifest.
Test a product-bound record in a private preview and save an immutable draft
version. Saving a version and publishing it are separate actions.
[Watch](docs/assets/showcase/app-studio.mp4) · [Build five useful apps](docs/app-tutorials/README.md).

[![Actual App Studio and private preview](docs/assets/showcase/app-studio.webp)](docs/assets/showcase/app-studio.mp4)

**Agentic grids:** search the full permitted order, product or customer directory,
arrange your columns and review AI filter suggestions before applying them.
The same native APIs and current access checks serve people and agents.
[Illustrated guide](docs/agentic-grids.md).

[![Actual shared order grid](docs/assets/agentic-grid/orders-en.png)](docs/agentic-grids.md)

[Full feature tour](docs/features.md) · [Video transcripts and capture boundaries](docs/video-tours.md).

## Intelligence with permission to act

**Ask VEYNDO** keeps workspace context, conversations, evidence and reviewable
proposals together. Authorized changes use the same permission and revision
checks as manual edits. Translation and image jobs produce private drafts.

Knowledge combines native products, uploaded sources, curated relationships,
observed purchases and explicitly configured app evidence. Public product answers
recheck supplied sources and current products after inference. Withdrawing a source
removes its eligible public evidence. Private merchant knowledge stays private.

Durable Flows connect events, conditions, delays, documents and configured app
actions. Execution traces expose results and failures. Bounded price autonomy uses
explicit guardrails and daily budgets; enabling it is an operator decision.

[Connected intelligence](docs/cognitive-commerce.md) · [Automation](docs/automation.md) · [Agent commerce](docs/connectors.md).

## Build experiences and apps

Use visual form controls, typed data, grids, code-behind and deliberate HTTP/MCP
permissions. Private previews execute real records. Compare a stage to its baseline
and publish selected changes; product-content releases preserve live inventory.

Connected Storyfront experiences can embed the shared checkout and verify order
completion before updating their bag. Human shoppers and agents reach authoritative
commerce owners through their respective interfaces.

[App Studio](docs/app-studio.md) · [App SDK](docs/app-platform.md) · [App security](docs/app-security.md) · [Experiences](docs/experience-integration.md) · [Checkout continuity](docs/storyfront.md).

## Operate across channels

| Area | Guide |
| --- | --- |
| Products, variants, media, translated content, categories and domains | [Product management](docs/product-management.md) · [Channels](docs/channel-management.md) |
| Customers, accounts, orders, fulfillment, invoices and downloads | [Merchant operations](docs/merchant-operations.md) · [Partial packages and provider-neutral shipping](docs/shipping-workflows.md) |
| Countries, destination taxes, shipping, payment and currencies | [International commerce](docs/international-commerce.md) · [Currencies](docs/currencies.md) |
| Native POS with shared orders, stock and documents | [Point of sale](docs/pos.md) |
| Business units, permissions, budgets, catalogs, quotes and approvals | [B2B commerce](docs/b2b-commerce.md) · [EDI](docs/edi.md) |
| Independent marketplace adapters and explicit seller configuration | [Marketplaces](docs/marketplaces.md) |
| Consent-bound visitor journeys and semantic observations | [Visitor intelligence](docs/behavior-intelligence.md) |
| Shop lifecycle, inherited models, diagnostics and tenant admission | [Platform operations](docs/platform.md) |

Studio supports English, German, Spanish and French, with separate dynamic content
locales. Connected providers require their own configuration; installing an app
does not silently connect an external account.

## Inside the foundation

**Rust + PostgreSQL + private Qdrant + bounded Wasm policies.**
PostgreSQL owns orders, stock, users, app records, knowledge and queues. Qdrant is a
rebuildable retrieval index; candidates are checked against current records and
publication state. Workers handle events, payments, translation, knowledge and media.
External calls stay outside database transactions.

[![The connected VEYNDO architecture](docs/assets/architecture/system.svg)](docs/production-architecture.md)

[Architecture](docs/architecture.md) · [Source map](docs/source-map.md) · [Security](docs/security.md) · [Tenant isolation](docs/tenant-isolation.md).

Personal merchant and operator accounts share optional authenticator protection,
one-use recovery codes and revision-checked password recovery through the existing
verified identity service. [Account setup, source owners and test boundaries](docs/account-security.md).

Verification includes Rust/frontend checks, real PostgreSQL integration, selected
original-PHP comparisons and Lean/mutation checks for named pure policies. These
checks have bounded scope; they do not establish full-system production maturity.

[Testing](docs/testing.md) · [Formal verification boundaries](docs/formal-verification.md) · [Shopware parity](docs/shopware-parity.md) · [Dated workload measurements](docs/benchmarks.md).

[System consistency audit](docs/system-consistency-audit.md): shared contracts,
repaired permission defects and remaining history, Storyfront and deployment boundaries.

## Current boundaries

| Area | Current scope |
| --- | --- |
| **Autonomy** | Authorized actions, durable workflows and bounded controls. Continuous autonomous optimization of an entire business remains a development goal. |
| **Production readiness** | Working prototype. Recovery/MFA, complete spend controls, relocation/failover and broader operational acceptance remain additional work. |
| **Payments & providers** | Simulated/manual payments, native PayPal and versioned payment-app contracts. Real provider outcomes require configured providers and separate acceptance. |
| **Protocols & compatibility** | Selected native Shopware behavior and HTTP/MCP/UCP capabilities; complete plugin/DAL/CMS compatibility and full protocol conformance are outside this slice. |
| **Apps & deployment** | Declarative packages and independent services, signatures and pinned UI bundles. Hostile-code containment and arbitrary source builds remain deployment responsibilities. |

[Complete feature scope](docs/features.md) · [Current release](docs/current-release.md) · [Managed hosting](docs/managed-hosting.md).

## License and contributions

Source-available under the **[VEYNDO Sustainable Use License 1.0](LICENSE)**.
Run and customize your own stores, brands and apps. Competing shop platforms,
white-labeling and managed commerce/SaaS for independent merchants require a
separate written commercial license. This is not an OSI-approved open-source
license. Earlier MIT-distributed versions retain their rights; third-party terms
remain intact.

[License examples](docs/licensing.md) · [Contribute](CONTRIBUTING.md) · [Report an issue](https://github.com/sthamann/veyndo/issues/new/choose) · [Third-party notices](THIRD_PARTY.md) · [Changelog](CHANGELOG.md).
