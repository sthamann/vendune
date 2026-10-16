# Compiler-enforced owners

Root instructions and [backend contracts](../src/AGENTS.md) apply here.
Crates must not depend on the root veyndo application. Commerce has no model or
transport dependency; apps have no SQL/network authority; cognition has no commerce
write capability. Runtime owns shared scoped SQL/network primitives; kernel owns
pure extracted policies. Preserve the public reexports in src/lib.rs for adapters.
Run workspace checks and the dependency negative controls before handoff.
