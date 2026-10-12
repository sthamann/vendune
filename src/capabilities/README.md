# Capability catalogue

`catalog.rs` lists the public HTTP/MCP names and descriptions. Authorization and dispatch remain in `../capabilities.rs`; domain modules own execution and permissions. Keeping the catalogue separate prevents new APIs from growing the dispatcher. The catalogue does not grant access.

Domain selection returns a boxed future synchronously before polling the child.
Do not rebuild one asynchronous match that embeds every domain future: debug and
coverage poll frames can overflow the worker stack even when the future state is
small. Keep native permissions unchanged and run real HTTP/MCP domain suites.
