# Furniture configurator

An app-owned material library and dimensional surcharge connected to native B2B
approval, checkout, saved input lists and current-price reorder. Start with the
**Configurable furniture** pattern in App Studio; see the [workflow and exact
acceptance boundary](../../../docs/furniture-configurator.md).

`manifest.json` is the canonical versioned definition. `configuration.wat` owns
its pure furniture rule; the Manifest embeds that source for immutable admission.
Core only hosts declared fields, bounded guest execution, source-currency pricing,
revision fences, native buying policy and checkout. Keep the source and embedded
text identical when proposing a new version. No plugin files are copied into
system directories and no per-installation SQL tables are created.

Seven synthetic configuration examples are frozen in the package. A modified
rule must fail incompatible examples before installation. Material records use
native optimistic revisions and history. Saved purchase lists store inputs only;
orders freeze the accepted fee, rule version and public material snapshot.

The public `configure` action is cart-capability-bound and available to MCP only
when enabled. Private material writes require catalogue authority; purchased
configuration reads require current `orders.read`. Native company membership,
independent approval, allocation/budget and stock checks remain authoritative.
The app has no payment provider, mailer or privileged database connection.
