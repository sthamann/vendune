# Generated policy driver

`dispatch.rs` calls production policy functions for the Rust/Lean conformance checks. `scripts/formal.py --generate` produces it from parsed signatures; never hand-edit or implement a second policy here. `../verified_kernel.rs` owns JSON-line input/output. The commerce server does not call this development binary.
