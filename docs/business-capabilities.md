# Your business model becomes software

**Target:** a merchant describes a business capability; Veyndo connects its data,
interfaces, decisions, automation and agent access, then makes changes testable,
reviewable and maintainable through the existing SaaS release path.

This is the implementation direction adopted on 15 October 2026. It does not claim
that managed build/microVM hosting, tenant-wide compatibility replay or automatic
canary rollback is already available. The [platform hardening programme](platform-hardening.md)
records the connected prerequisites and their actual implementation state.

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
