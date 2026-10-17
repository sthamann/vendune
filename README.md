<p align="center">
  <img src="docs/brand/veyndo-readme.svg?v=blue-20261014" alt="VEYNDO — Commerce that thinks and acts." width="100%">
</p>

<div align="center">

# VEYNDO

**Commerce, rebuilt for the AI era.**

[![Verify](https://github.com/sthamann/veyndo/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/sthamann/veyndo/actions/workflows/verify.yml)
[![Documentation](https://github.com/sthamann/veyndo/actions/workflows/pages.yml/badge.svg?branch=main)](https://veyndo.ai/docs/)
[![Working prototype](https://img.shields.io/badge/status-working_prototype-189EFF)](#current-boundaries)
[![Sustainable Use License](https://img.shields.io/badge/license-Sustainable_Use-189EFF)](LICENSE)

[Try one complete round](docs/first-tour.md) · [Watch the tours](docs/video-tours.md) · [First contributions](docs/early-contributors.md) · [Feature guide](docs/features.md) · [Architecture](docs/production-architecture.md) · [Documentation](https://veyndo.ai/docs/)

</div>

**A new Rust commerce platform with AI woven into the business itself.**

Veyndo connects products, business knowledge, merchant work, agents, automation and
apps on one Rust foundation. People and agents use the same native operations;
prices, stock, permissions and revisions remain authoritative.

**Start here: [current status, tested scope and open acceptance](docs/status.md).**
This is a working prototype, built in public. Local implementation, CI results and
public acceptance are recorded separately.

## One idea, one connected business

| Work | What connects it |
| --- | --- |
| **Ask, review, act** | The merchant assistant reads authorized shop context and prepares native changes for review. [Intelligence](docs/cognitive-commerce.md). |
| **Build the business** | App Studio, visual editing and coding agents share versioned app definitions, typed records and bounded actions. [App Studio](docs/app-studio.md), [native object extensions](docs/app-core-extensions.md), [order and quote workflows](docs/app-native-lifecycles.md). |
| **Shape the shop** | Design standard storefront pages on the actual preview; use original Storyfront for connected Experiences. [Visual design](docs/personal-workspace-and-shop-design.md). |
| **Automate the work** | Rules, events, durable Flows and app actions reuse native business operations. [Automation](docs/automation.md). |
| **Stay in control** | Current roles, private sandboxes, immutable versions and selected publication govern changes. [Security](docs/security.md). |

[![Veyndo Studio: native orders and agentic filters](docs/assets/launch-20261014/agentic-orders.jpg)](docs/agentic-grids.md)

Screenshots use synthetic shops; payments are simulated. Recordings retain their
capture dates and are edited for readability, not performance measurements.
[Watch the tours](docs/video-tours.md) · [Screenshot provenance](docs/assets/launch-20261014/README.md).

## Try one complete round

**Hosted:** [create a standard shop](https://start.veyndo.ai/start) or
[create a Storyfront Experience](https://experience.veyndo.ai/).
External models, payment providers and mail require their own configuration.
[Current public acceptance](docs/status.md#public-acceptance).

**Container tour:** Git, Docker Compose and OpenSSL; no local Rust/Node build.

```sh
git clone https://github.com/sthamann/veyndo.git
cd veyndo
./scripts/try.sh
```

Open `http://127.0.0.1:8788/`. Select a product, place a simulated order, inspect it
in Studio, change a product in a private sandbox and review a selected release.
[Complete tour and pinned image](docs/first-tour.md).

**Develop from source:** Rust stable 1.96+, Node.js 22+, Docker Compose, Python 3
for verification tooling. Run `./scripts/dev.sh` and open
`http://127.0.0.1:8787/#merchant`. Runtime commerce and connector services use Rust.
[Setup](docs/quickstart.md) · [Source owners](docs/source-map.md).

## Explore the platform

| Area | Start here |
| --- | --- |
| Catalogue, customers, orders and documents | [Features](docs/features.md) · [Admin walkthrough](docs/admin-workflows.md) |
| Countries, languages, currency and taxes | [International commerce](docs/international-commerce.md) · [Currencies](docs/currencies.md) |
| POS, B2B, EDI and marketplaces | [POS](docs/pos.md) · [B2B](docs/b2b-commerce.md) · [EDI](docs/edi.md) · [Marketplaces](docs/marketplaces.md) |
| Apps, settings, storage and private releases | [App platform](docs/app-platform.md) · [Build five apps](docs/app-tutorials/README.md) · [Shared storage](docs/app-data-storage.md) |
| Agents and shared operations | [Connections](docs/connectors.md) · [Agent identities & limits](docs/agent-authority-controls.md) · [MCP workshop](docs/agent-workshop.md) · [UCP B2B](docs/b2b-ucp-negotiation.md) |
| Operation and verification | [Architecture](docs/production-architecture.md) · [Testing](docs/testing.md) · [Proof boundaries](docs/formal-verification.md) |

The [handbook on veyndo.ai](https://veyndo.ai/docs/) follows seven ordered chapters,
with full-text search and article navigation. Technical articles retain their
source language; the reading interface supports English, German, French and Spanish.

## Current boundaries

Veyndo is an experiment platform, not established production infrastructure.
Simulated native and embedded checkout have dated acceptance. Real payments/refunds,
each OAuth provider, disaster recovery and capacity require separate evidence. Selected Lean proofs cover named
pure policies, not the whole system. Source builds, app lifecycle completeness and
operational controls are tracked explicitly in [the current status](docs/status.md).

[Contribute](CONTRIBUTING.md) · [Discussions](https://github.com/sthamann/veyndo/discussions)
· [Report an issue](https://github.com/sthamann/veyndo/issues/new/choose) · [Changelog](CHANGELOG.md).

## License

Source-available under the **[Veyndo Sustainable Use License 1.0](LICENSE)**.
Run and customize your own stores, brands and apps. Competing shop platforms,
white-labeling and managed commerce/SaaS for independent merchants require a
separate written commercial license. This is not an OSI-approved open-source
license. Earlier MIT versions retain their rights; third-party terms remain intact.
[License examples](docs/licensing.md) · [Third-party notices](THIRD_PARTY.md).
