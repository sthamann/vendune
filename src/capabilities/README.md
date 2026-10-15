# Capability catalogue

`registry.rs` binds each native operation once to its catalogue name, input schema,
domain owner, conservative safety hints and read-agent exposure. `admission.rs`
applies current domain permissions before discovery and execution; domain handlers
still own object, PII, CAS and business checks. Metadata never grants access.

`schema.rs` owns native input descriptions; `contract.rs` describes native and app
tools consistently. `dispatch.rs` selects the existing domain owner; it does not
implement another business service. See [platform hardening](../../docs/platform-hardening.md)
for the implemented boundary and remaining typed-contract work.

Domain selection returns a boxed future synchronously before polling the child.
Do not rebuild one asynchronous match that embeds every domain future: debug and
coverage poll frames can overflow the worker stack even when the future state is
small. Keep native permissions unchanged and run real HTTP/MCP domain suites.
