# Delegate an agent, keep control of the shop

An agent receives its own revocable credential, a small set of read permissions
and an explicit model allowance. It can inspect authorized information and prepare
a proposal. A person still approves business changes through the native operation.

**Implementation state:** local implementation and verification, 16 October 2026.
This guide does not claim deployment. [Current public status](status.md) is the
release authority. These controls do not make the whole app-concept programme complete.

## Configure a planning agent

Open **Developer → API & integrations** with a personal account that can manage
team access. Choose **Dedicated agent**, give it a recognizable name and select
only the data it needs. The scope is the intersection of the key's grants and its
creator's current membership; removing a role or revoking the key takes effect
on subsequent admission and saved-run continuation.

Specify all of the following; there are no unlimited defaults:

| Field | Meaning |
| --- | --- |
| Provider and exact model | OpenAI, Anthropic or Ollama and the exact configured model name. An omitted request model selects this approved pair; an explicit conflicting pair is denied. |
| Lifetime token allowance | Total conservative request allocations, across replicas, process restarts and sandboxes. |
| Allocation budget in USD | Total allocation at the approved ceiling tariff, stored as integer micro-USD. |
| Ceiling price per million tokens | An administrator-selected costing rule. Verify it against the provider/model you configure. |
| Permissions and expiry | Explicit read scopes, optional assistant use and separately granted personal-data access. Existing personal expiry rules apply. |

Copy the credential once and keep it outside prompts, source code and browser
storage. Subsequent lists show identity, permissions and counters, never plaintext.
A revoked agent key retains its accounting row. Replacing it creates a new identity
with a new allowance; agents cannot issue credentials or increase their own limits.

Agent profiles accept read permissions, `assistant.use` and explicitly granted
`customers.pii`. They cannot complete purchases, apply proposals, mutate apps,
create keys or invoke arbitrary app callbacks. HTTP admission and MCP discovery/
invocation enforce this, rather than relying on model instructions.

**Compatibility:** ordinary API keys remain available for their explicit native
integration operations. To start saved merchant-agent work or use central model
planning with a nonpersonal integration credential, create a dedicated bounded
agent key. A generic key is no longer an unmetered native AI credential.

## What is counted

Before each text-model request, PostgreSQL locks the live shop and key, checks
current admission, reserves the complete envelope, records an allocation event and
commits. Only then may the provider call start. Two Rust replicas cannot spend the
same remaining allocation. No transaction stays open while waiting for the model.

The envelope includes serialized UTF-8 request bytes, the bounded output allowance
and 4,096 units of framing headroom. Its cost is rounded upward from the approved
integer tariff. Successful, failed and uncertain requests retain their allocation;
continuation reusing a completed checkpoint does not allocate that call again.

**These are conservative allocation counters, not actual provider token invoices
or a guaranteed provider billing ceiling.** They do not reconcile credits or refunds.
Budgeted agents currently accept text-only model requests; paid query embeddings
and reranking are skipped in favour of native lexical retrieval. Background AI
jobs, independently operated app services and ordinary human interactive use are
not all covered by this per-key envelope. Existing daily attempt and shared
concurrency limits remain separate controls.

Exhaustion returns HTTP 429 with `kind: quota_exceeded`, `retryable: false` and
`pointer: /agentBudget`; it has no misleading short `Retry-After`. An administrator
must review a replacement delegation rather than repeatedly retrying an exhausted key.

## Stop the shop's merchant agents

A personal user with `ai.manage` sees **Agent control** in the same API workspace.
Stopping requires an explicit confirmation and current revision. The switch
always targets the live shop **and all its private sandboxes**, even when opened
from a sandbox. It cancels queued, running and uncertain native merchant tasks,
fences late worker results and blocks agent-key access and subsequent scoped
central model admission. An agent or ordinary integration key cannot lift it.

Already admitted or sent provider requests may finish and may be charged; the stop
cannot recall network requests. Late results from cancelled durable runs cannot
become executable proposals. Normal shopping remains available. Enabling the
switch permits new work; cancelled tasks do not restart automatically.

This is not a kill switch for every background indexer or independently operated
external service. The switch, credentials and allocation counters are operational:
configuration history, sandbox cloning and selected publication cannot restore or
increase them. Original financial approvals and domain invariants remain authoritative.

## Shared contracts and verification

| Owner | Responsibility |
| --- | --- |
| `integration_keys`, migration 104 | Existing identity and digest store, exact model policy and durable counters; no new table per agent/app. |
| `src/agent_runs/controls.rs` | Personal revision-bound status/control, planning-only credential admission and per-agent conversation identity. |
| `crates/cognition/src/inference/budget.rs` | Task-local trusted authority and transactional allocations at actual central model egress. |
| Native task/checkpoint/worker owners | Current credential/scope checks and lease-fenced continuation and final persistence. |
| Operation registry | `merchant.agents.status` and `merchant.agents.control`; HTTP `/api/agent/control`, MCP, generated TS/WIT/OpenAPI request contracts. |
| Existing outbox/Flows | `intelligence.agent.allocated` and `intelligence.agents.controlled` carry IDs/counts/state, never credentials or prompt bodies. |

`agent_authorities` runs actual HTTP/PostgreSQL, two Rust replicas and a local
synthetic model provider. It checks allocation races, independent token/cost
exhaustion, exact model mismatch, restart, two agents sharing a human creator,
foreign shops, revocation, sandbox stop and denied credential/commerce writes.
The signed-runtime foundation also repeats it through separate restricted tenant
and system logins. `durable_agents` stops a real worker during a provider call and
rejects its late result. UI tests fence late credentials and status from a previous
shop and require explicit limit/confirmation inputs. No real paid provider is used.

The small arithmetic allowance check reuses the existing extracted kernel guard.
That proof does not certify surrounding SQL, authentication, asynchronous workers
or external providers. [Proof boundary](formal-verification.md).
