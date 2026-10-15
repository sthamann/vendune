# Read-only WIT commerce hooks

`manifest.json` defines all four native commerce hooks: price, discount, shipping
and validation. Its `commerceHooks.source` uses the checked-in
[Component Model example](../../sdk/wit/snapshot-price.component.wat) and
[typed WIT contract](../../sdk/wit/commerce.wit). It reads bounded cart/product/app
record snapshots, returns typed decisions and has no network, SQL, filesystem,
WASI or arbitrary core mutation capability. The actual native money/tax/FX owner
calculates returned amounts. This fixture is deliberately synthetic, not an
economic recommendation or a replacement payment provider.

Import the manifest through package review in a private test shop, then add the
fixture mug to a cart. Inspect `appHookOutcomes`, quote changes and a reviewed
checkout/order. Compilation and probing happen before checkout transactions;
fuel, memory, table, stack, epoch and process admission limits bound execution.

`python3 scripts/verify_integration.py --only app_components` checks all four
quote outcomes, reviewed checkout and idempotent order persistence, foreign shop
isolation, malformed ABI and malicious host-call loops. See
[the canonical hook contract](../../../docs/app-platform.md).

Version 1.1.0 adds five frozen `capability.examples` cases to the same package.
Installation and App Studio save execute the existing WIT component against those
inputs before persisting a version. A wrong expectation or trap blocks admission.
The Business goal tab shows localized intent, assumptions and expected adjustments.
The native checkout still owns monetary effects, taxes, inventory and payment; these
synthetic cases are not a replay of historical customer orders.
