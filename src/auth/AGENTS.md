# src/auth ownership

Root AGENTS.md also applies. Rules below were moved from the root, not weakened.

## Tenant role and Studio admission ownership

Reusable roles belong to `workspace_roles` and `src/auth/roles.rs`; `membership_grants`
is the active current-role projection consumed by sessions, keys, callbacks and workers.
Only reserved owner authority is special. Do not reintroduce static role arrays for
access decisions or a second role/key store. Team delegation and invitation acceptance
use the tenant lifecycle lock, then rehydrate the actor and target grants; retained
explicit overrides also require delegation checks. New domains need named scopes in
`auth::SCOPES`, localized shared permission labels, native HTTP/MCP/action guards,
Studio presentation admission, history/staging policies and real denied-access tests.
Use an additive migration to evolve existing default definitions; never rewrite a
deployed seed migration. Generic app/AI Flow results are not safe merely because a
user can read automation status. Preserve cleaned summaries for limited readers.
B2B switches live in shared versioned commerce settings; channel inheritance may not
relax that global policy. See `docs/studio-access-and-setup.md` for the current owners.

Read [the system consistency audit](../../docs/system-consistency-audit.md) when adding
cross-domain entry points. Knowledge-source `document:*` diff/release units require
`knowledge.read`/`knowledge.write`, never catalog rights. MCP discovery must use
the owning operation's scopes; unrelated read grants must not gate write-only
operations, and channel grants must not advertise rule tools. History discovery
must require the same per-entity read/write/PII conjunctions as invocation; reuse
the native entity registry and PII classification rather than another scope list.
Classify every new
persisted entity's CAS revision, retained history, restore and staging policy
explicitly; a revision counter alone is not full content versioning. Keep live
financial and operational effects excluded from configuration rollback.

## Browser authority continuity

Read `docs/browser-sessions.md` before changing browser transports. Extend existing
`user_sessions`/`customer_sessions`; no parallel login gateway or browser bearer store.
Keep explicit API/MCP clients compatible, exact origins, per-tab proof fences, and
current server-side membership/tenant checks. Public /api storefront calls must never
inherit ambient merchant authority. Passive session/profile responses must not set
cookies or update accepted customer proofs. Capture tenant and session generation
before requests; late successes/401s cannot change a newer identity or another shop.
The entire merchant credential origin admits only build-owned scripts. Do not widen
that CSP for analytics or Maps; shared checkout retains manual address fallback.
Preserve cookie/MFA/handoff/MCP/preview/download/checkout negative regressions.
