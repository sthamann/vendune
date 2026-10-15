# Browser sessions: one ledger, separate merchant and customer authority

Studio, platform administration and customer accounts use their existing native
PostgreSQL session ledgers. Browser cookies change transport, not authorization:
each request still checks the current session, tenant, membership and domain rights.
There is no second login gateway or session database.

## What the browser carries

| Context | Private credential | JavaScript-visible value | Native owner |
| --- | --- | --- | --- |
| Merchant / platform | Host-only `__Host-veyndo-session`, Secure, HttpOnly, SameSite=Lax | Public mode marker and domain-separated anti-CSRF proof | `user_sessions`, `auth/identity`, current memberships / platform grant |
| Customer | Separate host-only `__Host-veyndo-customer-TENANT` with the same flags | Separate tenant-bound mode marker and anti-CSRF proof | `customer_sessions`, active customer and immutable order ownership |
| External API / MCP | Existing explicit bearer or integration credential | Defined by the external client | Existing identity, scopes and domain checks |

Cookies have no Domain attribute. A neighboring shop cannot set the merchant's
`__Host-` cookie. Only explicit loopback development admits non-Secure local names.
An HttpOnly cookie cannot be read by JavaScript; it does not by itself prevent
malicious same-origin code from acting as the user.

Browser clients opt into their transport with explicit headers. The server checks
the exact origin, never merely the shared parent domain. GET/HEAD without Origin
need `Sec-Fetch-Site: same-origin`. Cookie requests, including reads and Studio's
MCP explorer, need the corresponding anti-CSRF proof. Unmarked ambient cookies
grant no authority; public concierge, personalization and app calls do not become
merchant requests merely because they share the `/api/` namespace.

Each tab freezes its accepted proof. Logging in as another account in another tab
therefore suspends the old context instead of silently letting an old editor act
as the new account. Explicit login, one-use handoff and password/MFA rotations
can replace the accepted session. Successful authentication JSON contains a public
marker and proof, never the opaque browser bearer.

## Preventing late responses from changing identity

Passive session/profile reads never set cookies. They cannot overwrite a newer
login when a slow response arrives later. Customer transports capture the tenant
and session generation before sending; a stale profile or 401 cannot replace or
clear a newly accepted session or affect a different shop after navigation.

Legacy stored credentials move to memory for the current tab and are removed from
browser storage. Passive legacy reads do not issue cookies. A subsequent explicit
sign-in or existing onboarding handoff establishes the cookie session. Reloading
before that transition can require sign-in once. External bearer clients continue
using the same contract and are not forced into browser cookies.

Sign-out revokes the native session and clears both cookies. A stale
tab can explicitly clear this browser's cookie without revoking a different
account's session. A network/server failure is displayed; Studio does not pretend
sign-out succeeded and immediately sign the user back in after a reload.

## Script boundary on the merchant credential origin

`COMMERCE_PUBLIC_ORIGIN` selects the exact HTTPS merchant origin. Its responses,
including checkout and error documents, receive an additional intersecting CSP
allowing executable scripts only from build-owned `/assets/`. Uploads, inline
handlers, eval, arbitrary same-origin endpoints and third-party tags are excluded.
This does not widen the renderer's existing framing policy. Hosted storefronts on
separate shop origins retain their owner's policy and cannot receive merchant cookies.

A Google Places script or analytics tag therefore cannot execute on the merchant
credential origin. The shared embedded checkout retains editable manual addresses
and the existing unavailable-provider fallback. Google autocomplete remains an
opt-in integration on a separate shop origin with its configured public key and
consent. Do not weaken Studio CSP to enable a provider script; a future isolated
provider widget must retain the same origin and message-admission boundaries.

## Verification and deployment boundary

`browser_sessions` exercises actual HTTP/PostgreSQL sign-in, cookie attributes,
JSON redaction, exact origins, missing/forged proofs, duplicate cookies, account
switch, one-use handoff, native MCP, MFA enrollment/recovery and logout. Customer
cases independently check the tenant ledger, merchant denial and legacy API
compatibility. Passive responses are required to have no Set-Cookie headers.
Frontend transport tests delay profile/error responses across accepted identities
and shop changes; binary download, checkout and platform callers use the same owner.
Existing customer-order/receipt/download and app-surface suites remain required.

These are tested implementation boundaries, not a whole-system formal proof or a
claim that every third-party script is safe. Production acceptance must additionally
verify the deployed origin, proxy Host handling, actual browser login/reload/logout,
private previews and Experience handoff. Code, CI, migration and live activation are
recorded separately in the [delivery audit](delivery-audit-2026-10-15.md).
