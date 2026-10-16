# Your business model becomes software

**Target:** a merchant describes a business capability; Veyndo connects its data,
interfaces, decisions, automation and agent access, then makes changes testable,
reviewable and maintainable through the existing SaaS release path.

This is the implementation direction adopted on 15 October 2026. It does not claim
that managed build/microVM hosting, tenant-wide compatibility replay or automatic
canary rollback is already available. The [platform hardening programme](platform-hardening.md)
records the connected prerequisites and their actual implementation state.

## Executable first slice

The canonical Manifest now accepts optional `capability` version 1: localized
`intent`, localized `assumptions` and up to twelve frozen pure-decision `examples`.
App Studio exposes an **App idea** tab in the same editor. Its compact cards show
the declared input, expected money adjustment and acceptance, not fabricated pass
badges. Goal/assumption edits use the existing content-language inheritance and
immutable version save. A package without this field retains its old serialization.

Before a development version is saved or a package is installed, declared examples
run through the existing fuel/memory/host-call-bounded WIT component. A trap or
mismatch rejects the operation with a JSON Pointer to the case; no package, schema
or build is created. Native staging and selected publication use that same
installation owner. Existing AI presentation edits preserve the complete contract
and its cases rather than rewriting expectations to obtain a pass. Ordinary
coding-agent imports can propose explicit new contracts for merchant review.

The `snapshot-pricing` 1.1.0 package demonstrates five synthetic cases: an empty
cart, two subtotal amounts, zero-decimal JPY and zero-money validation. Its real
checkout still executes native pricing/tax and persists the component outcomes.
The manifest digest covers intent and examples along with code. Example metadata
is not included in public surface projections. Use synthetic inputs only; these
are package fixtures, not an import of customer history or credentials.

This first contract does **not** claim human-confirmed provenance, a general
historical checkout replay, full typed operation generation, native source builds,
managed I/O or Commerce Crater. Empty example lists provide no business-behavior
verification. Examples test their declared cases; they do not prove arbitrary app
correctness. The remaining ordered gates below still apply.

### Try the connected path

The merchant-facing entry uses plain language: describe an outcome, optionally add
requirements, then choose **Continue with AI or a coding agent** or **Design the
interface yourself**. Three explicit starting ideas help fill the brief. Editing a
description does not execute or generate an app by itself.

The assistant opens in the existing drawer with an editable request and the current
Manifest, including its requirements. It does not automatically call a model or
export a task. The merchant chooses Veyndo AI, Codex or Claude Code and explicitly
submits. Codex/Claude prepare the existing task handoff; returned changes still
require the normal proposal review. Pending handoffs are bound to app and sandbox,
consumed once, and do not replace a prompt belonging to another workspace.
When a goal or requirement lacks the shop main language, the brief explains the
missing content before saving and offers a direct language switch. It does not
copy a translation into another language or weaken native save validation.

![Plain-language App idea brief and next steps](assets/app-idea-20261016/overview.jpg)

[Shared agent handoff](assets/app-idea-20261016/agent.jpg) ·
[Mobile brief](assets/app-idea-20261016/mobile.jpg)

**Optional automatic rule checks** contains existing frozen pure-decision cases.
They are collapsed initially and label stored expectations as expectations, never
as successful test results. A display app with no cases is directed to its private
preview; absent cases still do not verify business behavior. The rule-check button
prepares an agent request, not fabricated fixtures or a replacement executor.

1. Open App Studio and edit a package carrying `capability`, such as the bundled
   snapshot-pricing lab. Pure decision packages open their App idea directly.
2. Choose the content language, edit intent or assumptions and save a new version.
   These edits use the same immutable Manifest as the visual editor and agent task.
3. Review declared synthetic cases. For example, a EUR 100.00 subtotal expects a
   EUR 1.00 adjustment; JPY uses zero decimal places. Cards show expectations.
4. Saving executes those cases through the existing WIT component. A wrong result
   blocks the save and identifies its case. Passing cases do not prove all inputs.
5. Stage and publish through the existing selected-release review. Installation
   reruns the cases; permissions, package consent and financial invariants remain
   authoritative. Return to the app overview without losing the selected draft.

The browser acceptance on 15 October saved a translated 1.1.1 development version,
restored the draft after reload, opened the shared AI modal without discarding the
selected goal and checked 390px mobile containment. HTTP/PostgreSQL cases separately
cover wrong expectations, trapped components, immutable build admission, staging,
selected release, foreign tenants and actual checkout outcome persistence.

## One capability contract

The versioned app Manifest remains authoritative. Extend it with the merchant's
intent, assumptions, admitted data/operations, examples, decision contracts,
dependencies, migration and failure behavior. The visual editor, coding-agent
proposal and API/MCP must edit that same contract. Manual changes keep stable IDs
and revisions. App implementation remains within its package owner.

The merchant should see the intended effect and relevant permissions/costs rather
than choosing between a plugin, iframe, Wasm module or separate service. Select the
weakest supported execution tier. Unsupported requirements must be shown as missing
capabilities; never silently turn them into unrestricted service access.

Keep the compact canvas and separate contextual assistant introduced in the
[workspace update](app-studio-workspace.md). Conversation is the natural entry to
a goal and its proposed changes; the visual designer, data model and code remain
available for precise editing rather than being replaced by an oversized chat form.

## Decisions with a controlled execution boundary

Pure extension functions consume bounded, revision-bound snapshots and return typed
decisions. Native money, inventory, tax, order, payment and permission owners validate
and execute accepted effects. A generic `before/after/replace` name is never permission
to replace authentication, settlement proof or another core invariant.

Introduce explicitly versioned domain contracts first for quote/checkout and order
transitions. Price contributions have declared phases, deterministic ordering,
dependencies and overlap diagnostics. Explanations must cite actual trace facts;
a model can phrase the explanation but cannot supply amounts or invariants.

The current Wasmtime dependency is already version 49. A numeric upgrade to “at least
46” is therefore unnecessary. Specific WASI/async/host interfaces, runtime limits
and untrusted-code hosting must be verified separately against primary documentation
and actual fixtures before being advertised.

## Data and lifecycle extensions

Namespaced typed extensions of Product, Customer, Order and Company must use the
existing tenant/app data contract and current field-level projections. Their API,
MCP, grids, search and knowledge consumers must share admission and schema versions.
Public exposure and PII access need explicit consent and current rights; installing
an extension never gives direct SQL access to core tables.

Declarative lifecycle extensions reuse existing state-machine, Flow, event and
history owners. Pure guards may narrow allowed transitions but cannot waive paid
shipping, stock or refund invariants. New business primitives such as period-based
rental availability need native domain implementation; a new form is not that feature.

## One complete proof case

Use a B2B furniture configurator as the acceptance flow:

1. Describe materials, special dimensions, surcharge and purchasing approval.
2. Review the intended data, storefront configurator, company/account views,
   production workspace, rules, external handoff and required permissions.
3. Confirm positive and negative examples in plain language.
4. Run the whole capability in a private preview with simulated external effects.
5. Change a dimension rule and review deterministic quote differences and conflicts.
6. Publish the compatible package/data change through current sandbox/CAS/release.
7. Demonstrate that old orders remain immutable, reorder behavior is explicit,
   ambiguous external effects remain fenced and a compatible core update preserves
   confirmed examples.

No illustrative turnover difference, speed claim or compatibility percentage is
acceptance evidence. Record actual input revisions, component/package digests,
outputs, rejected cases and the verified execution environment.

## Compatibility and operating model

Build a “Commerce Crater” check from the existing example-app and reference suites:
structural Manifest compatibility, versioned decision ABI, confirmed examples and
replay corpora. Start with checked-in packages and synthetic fixtures; evaluating
private tenant history requires its original permissions, retention and privacy
boundary. A failure creates a reviewable repair proposal, not an unapproved migration.

Code rollback does not reverse email, payment, shipping or other external effects.
Canary publication must preserve deterministic cart/order version binding and
explicit uncertainty; it is additional work beyond the current selective release.

Managed source builds and services require a real isolated execution owner without
production secrets, digest-pinned artifacts, capability-limited egress, budgets and
observability. MicroVM/platform services, tariff quotas and cell relocation must
not be represented by a Dockerfile or UI label alone. Existing private Storyfront
and Payments product boundaries remain intact.

## Ordered implementation gates

| Gate | Required user-visible outcome |
| --- | --- |
| Contracts and decisions | Existing pricing/message/engraving examples use typed versioned decision artifacts and repeat the same frozen quote inputs deterministically. |
| Complete B2B capability | The configurator works across shop, account, administration, approval, reorder, revisioned change and native release, with trace-based explanation. |
| Operated individual software | A supported source build, guarded service runtime and core compatibility check work through their actual production consumer. |
| Shopware migration | Inventory one supported extension, port its intent and compare actual scenarios against the original. Unchanged Symfony/plugin execution is a separate Enterprise-cell proposition. |

Shopware app/script compatibility, PHP analysis/porting and third-party hosting
claims need separately verified scope. The product is a publicly developed
experiment platform under the [Sustainable Use License](../LICENSE), not an
assertion of production completeness or guaranteed maintenance for every extension.

### App idea usability check — 16 October 2026

The UI follow-up retains the canonical intent/assumptions/examples fields and
native immutable save/preview/release owners. Browser acceptance uses a synthetic
local shop: choose a product-advice brief, add a private-team requirement, open the
shared assistant, explicitly prepare a real Codex task, return to the visual
editor, and save the goal/requirement in a new private version. A reload retains
both. The mobile brief remains inside its 390 px viewport. No paid model call or
public publication is implied by this UI acceptance.

The 583 frontend tests include no automatic execution on handoff, rejection of a
seed from another app/stage, regional content edits, optional-check disclosure and
preservation of frozen cases. Production TypeScript/Vite build, localization and
ownership checks pass. The registered native `app_generation` suite uses a synthetic
model HTTP fixture to exercise immutable drafts, real private preview, explicit
staging and rejected unsafe model changes. It is not a real-model quality test.
