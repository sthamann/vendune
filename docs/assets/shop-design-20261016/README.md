# Direct shop-design acceptance — 16 October 2026

These are local browser captures of the actual Studio and native Rust/PostgreSQL shop, not generated mock-ups. The work is not evidence of a public rollout.

- [Insert at the blue drop boundary](drop.jpg): drag a palette text block into the iframe; visible line and the toolbar identify the insertion position. The native home becomes an editable document without jumping to an obsolete scroll position.
- [Direct section controls](controls.jpg): selected section with grip, up/down arrows and bin. An actual captured-pointer drag moved the first section past the full hero and product list using edge scrolling. Arrow movement, removal and three undo operations restored the saved order.
- [Reference-led agent entry](agent.jpg): visible shop URL, screenshot/design upload and the shared Veyndo AI/Codex/Claude Code workspace. A real 2306 × 997 screenshot was reduced to 2000 × 865 WebP (108,447 data-URL characters); the instruction and references survive switching tools.

The browser journey saved the page through `site_builder.save_page`, reloaded it, selectively published its one app-data change through the existing staging review, then opened the ordinary storefront. The published section order matched the saved page and no editor toolbar appeared. Adding Form Stuhl opened the native checkout with the 189 EUR item. No new purchase or real payment was completed in this acceptance.

Desktop preview uses a real 1280-pixel iframe viewport. Mobile preview uses 390 pixels; the header, sections and footer stayed within it, with no link/button/heading/image/paragraph crossing its horizontal bounds.

Verification: 573 frontend cases in 103 files; production TypeScript/Vite build; formatting, localized UI/translation maps, architecture and source inventory. The real Rust/PostgreSQL `visual_workspace` suite additionally covers page revisions/history, scoped publication, app elements, tenant and permission denial, public forms, review/apply conflicts, coding-agent tasks and MCP. The added image case verifies that the exact bounded image reaches the central vision request, malformed images are rejected and deselected content remains unchanged.

The provider in that HTTP suite is deliberately synthetic. These checks prove input → inference contract → validated proposal → native approval wiring; they do not measure visual quality of a real model. URL capture remains bounded public HTTPS HTML evidence, not a rendered browser screenshot. No database schema, app permission, public origin policy or payment implementation was changed.
