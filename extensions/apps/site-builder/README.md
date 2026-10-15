# Shop design app

`manifest.json` defines the canonical pages, theme overrides and managed actions.
`server.rs` validates the bounded document. `design_agent.rs` prepares ordinary
revision-bound native tasks with the centrally configured inference service.
`references.rs` captures bounded public HTTPS evidence or supplied images; partial
capture is explicit. No browser source executes.

`Renderer.tsx` and `site.css` render both Studio previews and published pages.
`studio/` owns graphical controls, Tiptap text, reference alternatives and history.
`storefront/` mounts the app without replacing cart, account or checkout owners.
Global home appearance is inherited; channel home records override it. Public
queries enforce published status, time and channel on the server. Drafts stay
private. Existing staging diff/release publishes selected app packages and records.
`usePageProducts.ts` resolves explicit selections outside the first catalogue page
in native bounded batches; it does not price products or retain a separate catalogue.

Forms use the host's public form-block contract. The forms app owns intake and its
private inbox. The original private Storyfront editor remains a different app.

The Studio entry is preview-first: the existing native home is visible before a page record exists, and saved home pages open automatically. `studio/StorefrontCanvas.tsx` owns the static isolated viewport; native header/hero/product/footer **presentation** components are shared with the actual storefront. The preview creates no cart, shopper controller, tracking or payment session. `studio/home-draft.ts` converts an explicit selection to an unsaved native app document while preserving real language text and owned product-media references. `tests/` is registered through thin host test adapters; test code cannot be imported into production modules.
