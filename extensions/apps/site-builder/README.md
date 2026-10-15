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

Forms use the host's public form-block contract. The forms app owns intake and its
private inbox. The original private Storyfront editor remains a different app.
