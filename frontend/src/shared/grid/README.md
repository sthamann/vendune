# Shared agentic grids

`AgenticGrid` renders domain-owned columns, visible server criteria, bounded pages,
layout controls and optional reviewed model filters. It does not fetch or authorize
business records. `useGridPage` calls the existing native list APIs, debounces input
and fences superseded requests; errors clear rows instead of retaining stale data.
`GridAgent` calls the Rust read-only filter planner, validates returned field names,
and waits for Apply. `GridColumns` provides keyboard/touch ordering as well as drag
headers. Layout storage contains column IDs/density only, never PII or search text.

Every new entity directory uses this shell; supply explicit allowed columns and
server-backed filter/sort keys. Permission-restricted columns must not be supplied
or fetched. Agents propose the same typed criteria as manual controls; no model SQL,
new customer truth, privileged browser token or mutation endpoint is introduced.
Interface vocabulary lives in `grid-i18n.ts` in EN/DE/FR/ES. Domain labels and content
inheritance remain with their existing owners.
