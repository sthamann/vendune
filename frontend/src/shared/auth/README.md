# Shared personal authentication

Merchant and operator interfaces use the same native sign-in challenge contract.
`AuthenticationChallenge.tsx` collects a second factor without storing a pending
challenge as a session. Account response types live in `shared/api/account-types.ts`;
all interface text lives in `shared/i18n/security-i18n.ts`.

The server owns password checks, expiry, attempt limits, replay prevention and
current membership admission. Personal security is operational identity data and
is never cloned, restored or published through a shop sandbox.
