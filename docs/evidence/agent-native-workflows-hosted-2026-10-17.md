# Hosted App Studio workflow proposals — 17 October 2026

This receipt separates the public Core release, a configured-model walkthrough,
and deterministic provider fixtures. All business data belongs to the existing
synthetic **Release Abnahme 16 Oktober** shop. Payments are simulated.

## Released source and verification

| Item | Observed result |
| --- | --- |
| Source | [`7eb82c8`](https://github.com/sthamann/veyndo/commit/7eb82c85cae632cbb78174c93639da9553d30f78), merged by [PR 156](https://github.com/sthamann/veyndo/pull/156) as `6537ed1` |
| Source comparison | Candidate and merged main have identical Git tree `8b04c8adb71e662a1a9daa6b8929d87d8307d447` |
| Required CI | [39027714976](https://github.com/sthamann/veyndo/actions/runs/39027714976), successful; all registered HTTP, provider, browser-contract and tooling suites, 114 frontend files / 640 tests, unchanged coverage floors |
| Formal boundary | 59 extracted policies / 156,693 compiled Rust–Lean comparisons, no mismatch; mutation/binding/shortcut controls passed. Surrounding adapters and model output quality are not proved |
| Image | `distinct-roll-3524`, build successful in 8 minutes 36 seconds |
| Snapshot | `agent-workflows-20261017-7eb82c8`, completed 13:22:59–13:23:58 Europe/Berlin, 6 GB |
| Maintenance | Run `07d7eb83-3732-4bbd-a23e-21b5a6537e61`, successful in 16 seconds; migration-only setup completed at 11:44:09 UTC. This change adds no migration or physical app table |
| Core | `vendune-core-7c9554478`, pod `vendune-core-7c9554478-bmvmz`, started 13:44:30 Europe/Berlin; exactly one active instance, 1/1 passing, zero restarts |
| Public health/session | PostgreSQL health returned `ok`; the existing merchant session and saved app 0.1.2 survived reload after the release |

The redundant automatic main release `ddd52ee1-d83c-4d38-9b41-5b961fd0384d`
was aborted during its first build. The already verified equivalent image followed
the existing snapshot → successful maintenance → Core readiness sequence instead.

## Connected deterministic acceptance

The registered `app_generation` suite uses a local model-protocol fixture and real
Rust/PostgreSQL. It adds a native order review with `app-edit@2`, stages the
immutable build, explicitly installs it privately, publishes only that app package
and creates a native simulated order. The order enters the new review; missing
delivery blocks completion, and its accepted definition survives reload.

The versioned six-case adversarial corpus rejects weakened payment/delivery
guards, removed review states or extra rights, an identity swap, an unknown
native domain and an executable guard. Every hostile output also contains a valid
presentation edit: rejection remains atomic and creates no partial saved build.
Adding a missing quote domain preserves the existing order definition.

## Public configured-model walkthrough

**Not accepted on `7eb82c8`.** The configured platform model `gpt-6.1-sol` was
asked to add technical quote preparation to `app_mvc6ah4c`, preserving its existing
0.1.2 order workflow and all app data/UI. Two attempts returned HTTP 400. A scoped
browser network capture of the second response recorded
`Unsupported lifecycle edge, guard or permission`; the rejected model payload
was not returned or retained, so this receipt does not identify one particular
invalid field. No proposal was applied or published.

The failure message was also hidden behind the open assistant dialog. Closing it
revealed only generic input guidance. The shared schema supplied shape/limits,
but lacked the complete domain-specific native graph/replacement/scope context.
The follow-up derives that read-only context from the validator, distinguishes
failure categories and displays the localized refusal inside the dialog. It needs
its own release and fresh configured-model acceptance; local fixture success is
not a replacement for that missing public outcome.

## Acceptance limits

This release does not compile arbitrary app source, replay historical business
effects, settle real payments or certify every model output. Ordinary AI patches
can add a missing native domain; intentional changes to existing workflows use
the versioned workflow editor or reviewed coding-agent import.

The original embedded Storyfront purchase has not been newly accepted on this
image. The [previous workflow receipt](native-app-workflows-hosted-2026-10-17.md)
records the controller-held HTTP-200 iframe document and explicit parent timeout;
the [earlier successful embedded purchase](native-app-fields-hosted-2026-10-17.md)
retains its own source boundary. Neither result is relabeled as this release.

See [the workflow contract](../app-native-lifecycles.md),
[canonical status](../status.md) and [the remaining programme](../app-system-status.md).
