# Historical release record

For the current implementation and acceptance state, use **[Status](status.md)**.
This page preserves dated evidence.

# Release reviewed — 16 October 2026

## Latest recorded deployment — 16 October

Core [PR 141](https://github.com/sthamann/veyndo/pull/141), `fa2569f`, is publicly
running as Northflank `spiky-income-4612`, one healthy instance. Public Studio
acceptance checked grouped Shop Knowledge navigation and understandable AI price
boundaries, illustrated app creation, actual shop preview, section movement/undo
and the reference-design agent rail. Test design changes were undone and not
saved or published. The existing service builds automatically but requires an
explicit deployment; that step has now been completed.

The private Experience service is running `b40b386` (PR 73), build
`educated-sort-2532`, with session-return repairs and visible embedded-checkout
loading, timeout and retry. A fresh Safari session completed an actual original
Storyfront → embedded native checkout → confirmation → empty original bag flow:
**RAC-c10e5d2f, 24.90 EUR, one synthetic product, simulated payment**. The German
confirmation retained the German product name. The controlled Chrome session's
paused/empty iframe was recorded separately; its new recovery UI was visible.

[Exact release receipt and captures](evidence/studio-release-hosted-2026-10-16.json).
This does not establish real settlement, mail delivery, invoice setup, Apple OAuth,
capacity or completion of the unmerged platform-hardening programme.

![Public Shop Knowledge after deployment](evidence/images/studio-release-2026-10-16/shopwissen-live.png)

![Public embedded checkout confirmation with synthetic data](evidence/images/studio-release-2026-10-16/checkout-embedded-confirmed-live.jpg)

### Previous shared-storage acceptance — 15 October

The preceding hosted Core acceptance is the `f74f29d` source tree
(PRs 136–137), following the signed-database/browser/durable-agent releases.
It records four fixed shared app tables, no retained legacy app tables, preserved
records/references, selected private page publication and simulated purchases in
new SaaS, new Experience and existing original Storyfront shops. Embedded checkout
returned confirmation and cleared the Storyfront bag.
[Hosted evidence](evidence/shared-app-storage-hosted-2026-10-15.json) ·
[Shared storage and maintenance](app-data-storage.md).

The [app-system implementation map](app-system-status.md) distinguishes these
released foundations from the unfinished full B2B configurator, entity/lifecycle
extensions, historical business replay, isolated source builds, managed runtimes
and fleet compatibility. A documentation refresh does not deploy those features
or rerun every provider/browser scenario. The 16 October entry above records the
separate deployment of the subsequent UI and Experience fixes.

The earlier observations below retain their dates and original boundaries.

## Deployment and acceptance history

### 13 October

**VEYNDO deployment — 13 October:** [Core identity migration #102](https://github.com/sthamann/veyndo/pull/102) and [public documentation #103](https://github.com/sthamann/veyndo/pull/103) are merged. Northflank deployed Core `ced4a38` (`airy-wish-3827`) after a database snapshot and a successful migration-only job. Experience deployed `a6d3472` (`wiggly-crayon-7324`). Website, team, Studio, Experience and public shop routes now use `veyndo.ai` and the approved Living V identity. The checked public storefront loaded products, added a cart line and opened the simulated checkout; it did not place an order or charge a payment.

![Deployed VEYNDO Studio entry](assets/showcase/veyndo-admin-live.png)

![Public Experience checkout on the new domain; no order submitted](assets/showcase/veyndo-checkout-live.png)

Eleven existing frontend mounts across ten tenants were moved from the owned prior Experience origins to `https://experience.veyndo.ai`. The operator transaction preserves aliases and tenant/channel bindings, increments revisions and invalidates affected read caches. [Deployment and migration procedure](cloud-releases.md).

Current documentation uses new captures with synthetic fixtures. Dated acceptance captures below are immutable archive links, not new tests. Google branding and callback configuration were updated, and the new-domain sign-in reached the existing merchant workspace successfully. Eight stored native-shop links now use `veyndo.ai`; reloading displayed the corrected destinations. The Apple account update remains pending. The old root/team DNS cutover and certificate-renewal conflict are still operational follow-ups.

**Connected source audit — 13 October:** POS, B2B/EDI, marketplaces and visitor
intelligence share native version, rights, settings, sandbox, API/MCP and event
owners. The audit closes selective-release permission gaps, app Flow admission,
POS defaults, staging analytics capture and B2B history/policy publication. A real
Linux coverage MCP stack overflow is repaired in the shared dispatcher without
raising worker limits. [Integration matrix and walkthroughs](feature-integration.md)
· [Current test evidence and proof boundary](testing.md).

The source audit below is separate from the VEYNDO deployment above. The following
hosted/browser acceptance entries retain their original dates and image evidence.

**Cashier workspace — 12 October:** dedicated focus mode, customer/card selection, audited percentage/fixed adjustments, existing-model advice and system-printer invoice layouts now reuse the same commerce owners. Isolated native POS/provider/account suites pass. Local Chrome completed a customer-bound discounted sale, issued its immutable invoice and reached print preview without a physical print. [Setup, exact rights, acceptance and boundaries](pos.md).

**B2B acceptance — 12 October:** native company procurement and an independent Rust EDI app share the existing checkout, inventory, currencies, documents, outbox, Flow and MCP owners. Companies, unit hierarchy/cost centers, current employee grants, private catalogs, period budgets, exact-cart approvals, quote negotiation, SKU quick orders and repeat lists are implemented. Real HTTP/PostgreSQL tests cover parallel budgets, stale/self/foreign denial, revocation, negotiated-price checkout, receipt access and a real native Flow action. EDI acceptance covers EDIFACT/UBL/cXML import → private buyer list → native checkout → immutable document export and gateway restart/replay. These are bounded document profiles, not universal EDI partner compatibility or certified transport. [B2B contracts and illustrated setup](b2b-commerce.md) · [EDI profiles and limits](edi.md).

Local Chrome acceptance edited a unit cost center and observed its actor/revision history, selected a buyer unit/PO, added two native SKUs and requested approval. Reopening preserves the actual unit and PO. At 390 × 844 the account and document widths are both 390px, with no horizontal content overflow. EN/DE/FR/ES catalogs and a fifth content language are checked.

The B2B implementation is merged in [PR #93](https://github.com/sthamann/veyndo/pull/93) (`6beb771`). Both complete GitHub verification runs on `3776717` passed. Northflank's `lean-oranges-8265` image uses that byte-identical source tree; its migration job succeeded before the Core deployment reached Running, 1/1. A hosted Chrome check saved and reopened a synthetic company and purchasing unit with EUR budget `100000`, approval threshold `25000`, cost center and a required PO. A digit-led generated reference exposed a UI creation defect: the API correctly rejected it, and the shared reference generator and both editor request paths now have a regression. The public capture below used explicit valid references. Existing POS order `RAC-138a9e02` and invoice `INV-00000001` remained accessible after the deployment. No new EDI cloud service, partner transport or real payment was created.

[Archived capture from the preceding release: Hosted company policies persisted after reloading Studio](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/b2b-public-unit-20261012.png)

A subsequent local Chrome purchase completed **RAC-f0646e6d**, **134.83 EUR**, after an independent employee approved the final reviewed checkout. Bag **0** and the order survived reload. PostgreSQL recorded one `13483`-minor-unit budget allocation and a consumed approval. The follow-up fixes current-customer forwarding on the final checkout command and moves approval request/refresh into the reviewed checkout; it preserves the exact quote and native server checks. This browser acceptance uses a simulated payment. The normal order workspace also issued `INV-00000001`, visible to the separately authorized unit colleague through the existing account order detail. The customer-session/approval fix was subsequently deployed publicly as `small-dusk-4307` (`498faf8`), Running 1/1 with zero restarts. Hosted Chrome created and reloaded a new company and unit without overriding either generated reference; cost center, EUR 1,000 monthly budget, EUR 250 approval threshold and required PO persisted. This hosted editor acceptance does not constitute a real provider charge or a public B2B purchase.

[Archived capture from the preceding release: Fresh public company and purchasing unit, using generated references](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/b2b-public-created-20261012.png)

[Archived capture from the preceding release: B2B checkout after independent approval](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/b2b-checkout-approved-20261012.png)

App Studio exposes B2B, POS and PII permissions for both actions and embedded editor surfaces. A regression compares this selectable set with the native permission registry and verifies saving B2B action/surface restrictions.

The B2B acceptance run recorded above passed 449 frontend tests in 81 files. Its formal subset had 48 extracted policies and 104 properties, with 147,934 compiled comparisons and no mismatch; 133 deliberately broken policy variants were rejected. Database/network/UI behavior remains outside those proofs.

**Native POS local acceptance — 12 October:** a new channel type reuses shared checkout, exact cash/change, inventory, orders, invoices/PDF, currencies, coupons and Flow/App/MCP contracts. Browser and isolated PostgreSQL tests cover synthetic sales; a local provider fixture covers confirmed capture. This section describes implemented/tested code and does not itself confirm hosted deployment or a real terminal charge. [Usage and limits](pos.md).

**12 October lifecycle follow-up:** returns now own a guarded status lifecycle;
App Studio retains confirmed form revisions and filters selected-app versions.
Generic core code fences writes against current installed packages and shares
app-network admission across replicas. The ERP example includes an app-owned
Rust adapter and forced-RLS receipts, signed events, cold-restart deduplication
and explicit reconciliation. [Contracts and verification boundaries](connected-workbench.md#lifecycle-and-reference-app-follow-up--12-october-2026).

The companion private Experience admission fix is publicly active. A 12 October
browser check reproduced the old HTTP-reference 400, then accepted the normalized
HTTPS reference and reached the original Storyfront brand editor. This check used
the standard demo catalog, made no new images and did not publish or charge an order.

Public App Studio acceptance in a fresh `start.veyndo.ai` sample shop created
`advisor_mv4xhvzp`, installed it privately, released its package and separately
selected one product record for Live. Its public Bag product page displayed the
saved advice. Version 0.1.1 changed the app name; restoring the old package as
0.1.2 preserved its published data. Recoverable archive/restore retained all three
builds. A subsequent simulated checkout saved **RAC-96c745a2**, **169.00 EUR**,
and returned Bag **0**. This acceptance preceded the new Core runtime deployment;
it validates the existing lifecycle and checkout, not every new guard in production.

[Archived capture from the preceding release: Public creation reaches the original Storyfront draft](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/experience-admission-20261012.png)

[Archived capture from the preceding release: Original Storyfront brand editor reached from the corrected onboarding](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/experience-original-studio-20261012.png)

[Archived capture from the preceding release: Public simulated checkout following app upgrade and restoration](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/app-lifecycle-checkout-20261012.png)

The follow-up Core is merged in [PR #90](https://github.com/sthamann/veyndo/pull/90)
(`6823f6f`). Both complete GitHub verification runs on `cdd0724` passed. The deployed
`eminent-middle-497` image uses `cdd0724`; its complete source tree is byte-identical
to the squash merge. Northflank confirms Running, one instance, on the existing
0.5 vCPU / 1 GB service. No extra ERP service was created or charged.

A fresh browser checkout on this deployed image saved **RAC-40dfc8d2**,
**43.90 EUR**, including **4.90 EUR** delivery and **7.01 EUR** VAT.
Its immutable receipt and Bag **0** persisted after reload. This was a simulated
payment with fictional contact details, not an externally settled purchase.
The updated public App Studio separates merchant and shopper views, hides the
payment-provider tab for non-payment apps, and recognizes the restored package
as an already saved version. The earlier receipt remains available after deployment.

[Archived capture from the preceding release: Updated public App Studio with distinct merchant and shopper surfaces](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/app-studio-after-release-20261012.png)

[Archived capture from the preceding release: Fresh simulated checkout receipt persisted after the Core deployment](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/app-lifecycle-after-release-20261012.png)

The corrected suite includes **202 Rust tests, 433 frontend tests**, all registered
HTTP/PostgreSQL/provider/browser-contract suites and their formal/differential/
coverage gates. Local frontend line coverage is **64.39%**, not 100%. A separate
fresh PostgreSQL SCRAM fixture checks actual adapter/password authentication.
New app workflow, asynchronous SQL, provider and UI behavior remain outside Lean's
extracted policy proofs. Qodo's local CLI was unavailable; no external local review
is claimed. The ERP Docker dependency closure was checked, while local container
execution was unavailable; the actual Rust adapter process was tested independently.

**12 October workbench update:** editable app patterns, explicit AI/agent proposal review, native control generation, approved catalogue translation jobs and scoped personalization. [How to use it, ownership and verification boundaries](connected-workbench.md).

**Illustrated app workshops:** five practical guides now cover product advice,
private returns, customer fields, UTC review reminders and ERP handoff. Fourteen
current English browser captures show actual assistants, models, controls,
connections and versions. Each guide includes a coding-agent task, required
permissions, preview/release steps and explicit integration boundaries.
[Start the five workshops](app-tutorials/README.md).

[Feature tour](features.md) · [Architecture](production-architecture.md) · [Complete documentation](documentation-site.md)

The earlier connected intelligence and app release was merged in Core
`598bbec112165fcac1847797786e2ba5c606e06f`. The private Experience adapter pins
that Core and original Storyfront `2087783606e5c925317bae57625256a82c16bff0`;
its dated release was `f970543124d669971330945f74b87e9c799a76e4`. The public native update below supersedes that runtime observation.
[Complete changes, repeatable acceptance and remaining work](release-acceptance-2026-10-09.md).

The static API catalogue contains **280 HTTP method/path pairs**; installed app
routes are discovered separately. The source inventory contains **432 Rust
modules**. The formal subset has **45 extracted policies and 97 properties**,
with **142,298 compiled comparisons and no mismatch**. SQL, network and UI behavior
remain outside those proofs. [Formal evidence](formal-verification.md).

## Marketplace channels

Amazon, eBay and Kaufland adapters, offer overrides, native sync jobs and reviewed
paid order intake are implemented in an independent Rust app. Local provider/DB/UI
regressions are available; live seller credentials and a hosted adapter are not
configured by this release. [Guide and exact boundaries](marketplaces.md).

## Public original Storyfront update — 9 October 2026

### Checkout continuity

[PR #82](https://github.com/sthamann/veyndo/pull/82) adds the existing native
VEYNDO checkout as an embedded surface inside the original Storyfront experience.
The same calculation, legal review, delivery, payment and immutable order owners
serve both checkout surfaces. Only the registered shop/channel origin may embed
the checkout; foreign origins and non-default HTTPS ports are rejected.

Original Storyfront verifies a completed order against the Core cart capability,
order ID and exact purchased quantities before removing those quantities from its
own Bag. Later additions remain in the Bag; repeated completion messages cannot
consume them twice. Canceling checkout retains the Bag. A saved completion receipt
can be retried after reload when confirmation was temporarily unavailable.

[PR #83](https://github.com/sthamann/veyndo/pull/83) also routes the native
checkout's close button and Escape cancellation back to its registered parent.
This prevents an empty outer dialog after closing only the inner checkout.
Composition regressions exercise both paths and ordinary top-level checkout;
the local frontend suite passes **396 tests in 67 files**.

Order item names use the cart's content language, including parent/variant
inheritance, and remain immutable after later translation edits. The private
gateway forwards the selected Studio language to the original editor. Its overview
uses the actual connected catalogue and published address instead of unrelated
crawler/import status. The merchant signup now offers explicit sign-out/account
switching without discarding the shop draft.

[Ownership, failure handling and sequence diagram](storyfront.md#native-checkout-continuity-9-october-2026).

Public acceptance on 9 October saved **RAC-faa7dde0**, **44.80 EUR**, including
**4.90 EUR** delivery and **7.15 EUR** VAT, through this embedded checkout.
The receipt saves the German Tee name. Returning to the original experience
shows Bag **0**, still **0** after reload. Canceling the first checkout kept Bag
**1**. At 390 × 844 the checkout dialog measured exactly 390 × 844 and the outer
document measured 390px, without horizontal overflow. The existing AI-demo
catalog was reused; this acceptance made no new model/image call or real charge.
Core image `acc137c` has exactly the merged `aa4e644` source tree and passed both
full CI runs before deployment.

[Archived capture from the preceding release: Native checkout inside the original Storyfront experience](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/native-embedded-checkout-20261009.jpg)

[Archived capture from the preceding release: German immutable receipt from the embedded demo purchase](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/native-embedded-receipt-20261009.jpg)

[Archived capture from the preceding release: Original Storyfront Bag remains empty after reload](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/native-bag-cleared-20261009.jpg)

Private release `414e117` is healthy with the original Storyfront `b11b6e4` pin.
The public original overview now opens in German, reports the live address,
three catalogue products and three chosen products, and says that no work is
pending. Navigation and budget/status copy use the four-language source catalogue;
original renderer chrome and other advanced editor copy remain a separate
localization scope.

[Archived capture from the preceding release: Original German Studio overview with actual connected live state](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/native-overview-de-20261009.jpg)



The earlier hosted React Studio observation below is historical. The existing
Experience service now runs the original private Storyfront Astro Studio and
Cinematic renderer, not a recreated editor or storefront. Private release
`1c3c663` builds original `2087783606` from checksum-checked private source archives.
A separate original presentation database and a persistent 6 GB asset volume keep
workspaces and generated media through stop/start deployment. Core remains the
only catalog, identity, price, inventory and order owner.

A freshly verified Cobalt onboarding accepted three actual model-proposed demo
products, generated three product images, stored four catalog languages and opened
the original Studio. Original review, worker Build and Go live completed for Cobalt
and the existing Luma catalog. An original writing-style edit survived reopening
and service replacement. A real German question in Luma produced a new original
multi-chapter scene naming its three products and correct 24.90 EUR Tote price.
The native Bag opens with item counts, removal and total; a 390px check measured
390px document width.

[PR #79](https://github.com/sthamann/veyndo/pull/79) fixes hosted original public
API routing with current tenant/channel/preview admission. Private PR #42 removes
intermittent module activation failure by sharing only still-running admission
checks, immediately forgetting completed checks. No stale authorization cache or
quota bypass is introduced. [PR #80](https://github.com/sthamann/veyndo/pull/80)
keeps the native checkout transfer on the shared `/checkout` route. Its merged
Core `b995b5a` is deployed as `dependent-floor-9352`; the new pod passed its health
check. The actual original Bag transferred two canonical Canvas Totes into the
shared checkout. Fictional address entry, standard delivery and simulated payment
saved **RAC-4aed0976**, **54.70 EUR** total, **4.90 EUR** shipping and **8.73 EUR** VAT.
The receipt confirms simulated authorization; no money was charged. The return
button exposed a separate SPA-navigation defect, repaired with canonical hosted
navigation while preserving local SPA behavior and channel/language scope.

[Archived capture from the preceding release: Original Storyfront Studio in the VEYNDO frame](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/native-public-studio-20261009.png)

[Archived capture from the preceding release: Actual original German product-answer scene](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/native-public-ai-scene-20261009.png)

[Archived capture from the preceding release: Actual original Bag to canonical checkout receipt, fictional contact details](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/native-public-checkout-20261009.png)

Original intro/controls still include English copy. Universal native worker
provider inheritance, complete advanced-media import, externally settled payments
and production capacity are not established by these tests. Existing retained
renderer shops only switch after completing original Go live.

## Connected intelligence release

Merged [PR #73](https://github.com/sthamann/veyndo/pull/73),
[PR #74](https://github.com/sthamann/veyndo/pull/74) and
[PR #75](https://github.com/sthamann/veyndo/pull/75) connect automatic bounded
indexing/model rebuilds, lexical/dense retrieval with optional reranking,
authorized read-agent rounds, reviewed source claims, signed public facts,
price guardrails/daily autonomy budgets, controlled layout experiments,
consent-bound cart preferences and native app ontology projections.
The current embedded-checkout CI passes **187 Rust unit tests and 393 frontend
tests in 66 files**, all registered database/browser-contract suites and the
formal/differential gates. Whole-source CI line coverage is **90.56% Rust /
63.34% frontend**; this remains partial coverage, not a whole-system guarantee.
[Complete verified checkout source run](https://github.com/sthamann/veyndo/actions/runs/37907948163).
[Architecture, configuration, evidence and incomplete audit items](cognitive-commerce.md).

Product answers and buyer advice recheck their admitted native product/source
inputs after inference; concurrent source, consent or commerce changes return
localized retry guidance. API, MCP, categories and opt-in document-event flows
reuse current native rights and storage. This does not make arbitrary generated
prose true, train model weights or complete every audit item.

Completed CI and public documentation are source evidence. The 8 October hosted
observations below remain dated observations of that earlier runtime: the original public activation is recorded above. Neither source CI nor the
public acceptance establishes external payment settlement or production capacity.

## Core hardening update

The eighteen-point core review is addressed in [the hardening guide](core-hardening.md): typed trusted identity and explicit route rights, strict deployment roles, consolidated current grants, shared tenant/connection leases, transaction-local SQL/PgBouncer, bounded off-thread Wasm/image work, commit wakes, isolated outbox retries and retention. The guide distinguishes source/tests from a verified public rollout.

## What changed and where to use it

| Capability | Merchant workflow | Implementation / evidence |
| --- | --- | --- |
| Storyfront installed with Experience | Apps → Storyfront; Storyfronts; channel Domains & experiences | Mount and package installation commit together; migration 055 repairs older mounts. [PR #67](https://github.com/sthamann/veyndo/pull/67), [ownership](channel-management.md#storyfront-app-ownership-for-experience-shops) |
| Editable channels and frontend connections | Sales channels → Manage channel → Basics / Domains & experiences | Rename, translate, assign/disconnect addresses, pause/resume or switch public/private; personal previews remain read-only. [PR #65](https://github.com/sthamann/veyndo/pull/65), [admission](channel-management.md) |
| Guest buyers visible to merchants | Customers → guest buyer → linked orders and checkout addresses | Derived contact from immutable order snapshots, not a newly authenticated account. Entering an email cannot claim another person's orders. [PR #66](https://github.com/sthamann/veyndo/pull/66), [customer ownership](merchant-operations.md) |
| Personal merchant enrollment | Welcome-access link → choose/confirm password → normal Studio session | Scanner-safe access page; canonical account checks, session revocation and one-use handoff. [PR #63](https://github.com/sthamann/veyndo/pull/63), [identity contract](experience-integration.md#merchant-password-enrollment-and-email-link-recovery) |
| Existing experiences discovered | Storyfronts → Edit experience / Open shop | Tenant-bound mount registry, safe operator editor template, no generated duplicate. [PR #64](https://github.com/sthamann/veyndo/pull/64), [discovery](experience-integration.md#discover-and-edit-existing-experiences) |

The main `default` storefront cannot be deleted or changed to headless; it **can** be
paused or made private. Additional channel deletion checks current orders, customers,
carts, overrides and frontend references under transaction/revision protection.
A configured subdomain is distinct from provisioning DNS/TLS for an arbitrary
external customer domain.

## One connection, several views

![Experience ownership, atomic installation and existing editor path](assets/experience-connections.svg)

Core owns catalogue, price, stock, authentication and checkout. The private Experience
service owns presentation and its current/native editor selection. The public
Storyfront manifest links them; it contains no closed renderer or provider keys.

[Archived capture from the preceding release: Managed Storyfront connection and its existing editor](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/storyfront-managed.png)

![Actual domain and channel management](assets/showcase/channel-domains.png)

## What was observed, and what remains separate

- **Publicly observed:** the owned Retro Commodore demo shop shows one installed and
  enabled Storyfront app, its existing domain and main channel. Its Edit experience
  link opens the retained **React Experience Studio** with its published revision
  and preview. The Core and private Experience releases were healthy.
- **Tested in isolated CI:** persisted app ownership/backfill and channel admission;
  private native Docker builds the original Astro Studio/Cinematic applications and
  checks original pages, brand persistence and anonymous/foreign-owner refusal.
- **Not inferred from those tests:** public native-renderer activation, every native
  media import, native worker model inheritance, complete original UI localization,
  Google/Apple OAuth acceptance, real payment settlement or production capacity.
- **No external transaction for this documentation refresh:** no new email, paid
  inference, image generation or payment; the new screenshots are passive English
  captures of an owned public demo. [Exact media provenance](https://github.com/sthamann/veyndo/blob/ced4a3887086e8c6a943d774a78bc8cca5deb5dd/docs/assets/showcase/README.md#public-integration-captures-8-october-2026).

The retained 6 October fashion demo recordings are dated evidence of those local
workflows, not relabelled captures of this later release. For full scope, use
[Shopware parity](shopware-parity.md), [measured tests](testing.md),
[formal boundaries](formal-verification.md), [payments](payment-provider-api.md),
[currencies](currencies.md) and [production architecture](production-architecture.md).
