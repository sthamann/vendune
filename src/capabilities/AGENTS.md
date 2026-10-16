# src/capabilities ownership

Root AGENTS.md also applies. Rules below were moved from the root, not weakened.

## Operation registry and business-capability continuity

Read `docs/platform-hardening.md` and `docs/business-capabilities.md` before expanding
agent execution or app architecture. `capabilities/registry.rs` binds native schemas,
boxed domain routing, discovery and safe read-agent exposure; transports do not own
second name/schema/visibility lists. `ToolContract` describes native and app tools;
metadata never grants rights. Domain object/PII/CAS/business checks stay authoritative.
An app output-contract failure may follow a real external effect: preserve its
non-retryable/uncertain boundary, never automatically re-run it as harmless validation.

Outbox dispatch scheduling metadata is operational, forced-RLS and never a release
unit. Lock scheduling rows rather than tenant roots, preserve per-event savepoints
and exact original outbox consumers. A fair tenant batch is not independent subscriber
checkpointing. The remaining system-role/cookie/CSP issues in the tracker are not
repaired merely by safer identifier quoting or successful ordinary isolation tests.

Extend the canonical Manifest for complete business capabilities; reuse existing
data, decisions, history, staged publication, Flows and central inference. No second
app ledger, source-copy installation, queue, CMS, pricing owner or private Storyfront
implementation. Choose the weakest actually supported runtime and keep unsupported
hosting/ABI/canary/replay capabilities explicit. New operation extension points may
narrow decisions but never replace core authorization or financial invariants.

`Manifest.capability` version 1 owns localized intent, assumptions and frozen pure
commerce examples. `apps/business_capability` converts synthetic fixtures to the
existing WIT snapshots; `commerce_hooks::verify_package` uses the same sandbox as
checkout. Run it before immutable developer save and native installation. Never
replace expected outputs from model guesses to make a case pass, claim empty
cases verify behavior, or export customer history/secrets as package fixtures.
Existing AI edits retain the contract; explicit new versions remain reviewable.
Business code stays in its app package. These cases are not whole-app proof or
human-confirmation provenance; keep the remaining business-capability gates open.

