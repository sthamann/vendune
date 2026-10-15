# Saved agent work: resume without losing control

Merchant conversations submit work to the existing PostgreSQL `tasks` owner.
The Rust worker prepares the same revision-bound proposal as before. Closing the
browser or losing its HTTP response does not delete the task. A proposal still
needs native approval; continuation never applies a price change.

This page describes source implementation and local acceptance. Public deployment
must be verified separately. It does not claim unrestricted autonomous goals,
general app-write checkpoints or exactly-once model billing.

## What the merchant sees

Send an instruction in Studio. The conversation and message are saved immediately;
a compact card shows queued, running, ready, stopped or uncertain progress.
Reloading the conversation restores its saved run. Completed model-step counts
report stored responses, not invented percentages or internal reasoning.

An interrupted in-flight provider call is **uncertain**: the provider may have
accepted or charged it. Veyndo does not automatically repeat that call. Continue
explicitly to permit another attempt, or cancel. Completed earlier responses are
reused. Changing account, shop, sandbox or conversation fences late UI responses.

```mermaid
flowchart LR
    UI[Studio / HTTP / MCP] --> ADMIT[Current actor, scopes, channel and quota]
    ADMIT --> TASK[(Existing tasks and conversations)]
    TASK --> CLAIM[Bounded Rust worker / fenced lease]
    CLAIM --> READ[Current authorized native reads]
    READ --> MODEL[Central inference]
    MODEL --> CHECKPOINT[(Private completed checkpoints)]
    CHECKPOINT --> CLAIM
    CLAIM --> PROPOSAL[Revision-bound proposal]
    PROPOSAL --> REVIEW[Original native approval]
    REVIEW --> CORE[Commerce operations]
    CLAIM --> UNKNOWN[Interrupted call: explicit continue or cancel]
```

## One native contract

| Operation | HTTP | Behavior |
| --- | --- | --- |
| `merchant.run.create` | `POST /api/agent/runs` | Save an instruction; optional `requestId` deduplicates retries. |
| `merchant.run.status` | `GET /api/agent/runs/{id}` | Safe progress and completed preview, with current original scopes. |
| `merchant.run.cancel` | `POST /api/agent/runs/{id}/cancel` | Require `approve: true` and current `revision`; fence the worker. |
| `merchant.run.resume` | `POST /api/agent/runs/{id}/resume` | Explicitly continue failed/uncertain work using the same credential kind. |

These operations use the common capability registry. Studio submits native chat
with `background: true` to the same queue. Legacy planning calls wait for a bounded
interval and retain synchronous failure responses. A pending run can outlive that
wait; no second planner is introduced.

`requestId` belongs to tenant plus original actor. An identical accepted retry
returns its original task, conversation and message, including at the daily quota.
Changed input with the same ID conflicts. Only new work consumes the shared attempt
quota; explicit continuation consumes another attempt. This is not token/spend accounting.
Native create/resume admission commits the shared live-shop quota and saved work
in one system transaction after checking the actor and permissions. It never
holds a tenant transaction while waiting for a second database connection, so
one-backend transaction poolers remain supported. Rejected or rolled-back work
does not consume an attempt; admitted provider failures still do.

## Authority and operation

- Store only the credential digest, personal/integration kind and initial scope
  ceiling. Recheck current session/key, membership, shop and private-preview owner
  and expiry on continuation. Broader later grants never widen the saved run.
- Conversations and checkpoints are actor-private. Original evidence scopes apply
  to history reads and new turns. A current personal owner can stop a colleague's
  run without reading its private continuation. Proposal approval retains existing
  collaboration and current domain rights.
- Reauthorize previously read evidence before reuse. Withdrawn/changed sources or
  app context stop continuation before more inference. Model output cannot grant
  its own permissions or expected revisions.
- Migration 100 extends existing tasks/conversations under forced RLS and signed
  SQL policies. Runs are operational, never configuration releases.
- `PROCESS_ROLE=agent-worker` starts a separate Rust worker; `all` includes these
  loops. Two loops per process, one running task per tenant, twenty active/uncertain
  tasks per tenant and bounded requests/checkpoints limit execution. Existing central
  inference admission still applies. Worker-only roles expose no HTTP listener.
- Claim/checkpoint/final writes require the current unexpired lease. No SQL
  transaction stays open during a model call. A dead worker between calls can
  requeue; a pending call needs explicit review. `intelligence.run.changed` outbox
  progress contains IDs/state, never private context.

The planner supports bounded read-tool rounds and one native proposal. This is
not a general durable executor for arbitrary writes/external effects. Lean proofs
remain separate from SQL, authorization and provider integration. Purpose-separated
keys and historical business replay remain tracked work.

## Actual acceptance

`durable_agents` uses real PostgreSQL, HTTP/MCP and two Rust process roles with a
synthetic local provider. It kills the worker during inference, starts another,
checks uncertainty, resumes explicitly and proves only native approval changes
price. The disposable job and killed worker's model lease clocks are advanced to keep the test short; this
is not a measured 240-second recovery SLA.

Cases cover parallel retries, quota-bound retries, HTTP restart, tenant/same-shop
actor isolation, credential/role withdrawal, cancellation, withdrawal of a separately
discovered source and synchronous HTTP/MCP errors. Frontend tests cover late
responses, retained conversations, revision controls and send-success/refresh-failure.
No real paid provider, mail, payment or private customer data is used by these tests.
