# App Studio

A visual workbench over the **same versioned Manifest** consumed by the Rust runtime, HTTP APIs and coding-agent imports. The browser compiles data bindings into existing authorized actions; the Rust server validates every installed package independently.

- `DeveloperView.tsx`: workspace, tab navigation, one content-language scope and sandbox selection.
- `app-model.ts`: pure schema edits, action binding, dependency cleanup and bounded undo/redo.
- `AppCanvas.tsx`: accessible click-to-add/select/order/remove components.
- `AppInspector.tsx`: app/view/block properties with inherited translations.
- `AppDataEditor.tsx`: typed managed data fields and public-read settings.
- `AppConnections.tsx`: HTTP routes, AI grounding/tools and Flow Builder opt-in.
- `AppAgentPanel.tsx`: current-manifest prompting, Codex/Claude task export, authoritative schema download and agent JSON round-trip.
- `useAppStudio.ts`: immutable build lifecycle and exact saved-snapshot checks.
- `AppVersions.tsx`: version inspection, digest-approved staging and selective package release.
- `SandboxPreview.tsx`: authoritative installed-registry resolution, including rejection of a stale preview version.

The actual renderer is in `shared/apps/native/`, shared by the sandbox preview and released admin/storefront views. Freely executable app services retain the isolated iframe/service path; the native builder does not execute scripts or start a shell.

Run frontend build, tests, coverage, localization and architecture checks. See [App Studio guide](../../../../docs/app-studio.md) and [testing boundaries](../../../../docs/testing.md). Test presence is not 100% whole-codebase coverage.

- `AppLibrary.tsx`: clickable saved app cards with explicit edit/delete, confirmation and restore; opens the latest build as a new editable version. Both library and version-list editing return to the design workspace.

- `AppAssistant.tsx`, `assistant-model.ts`: nine guided types compiled into the shared versioned contract.
- `AppFieldOptions.tsx`, `AppContextBinding.tsx`: owned core references, translated choices and host context.
- `AppActionAccess.tsx`: independent team scopes and MCP flags.
- `AppAutomation.tsx`: declared service events, UTC cron and signed ingress.
- `AppViewTabs.tsx`: view navigation and creation.
- `SandboxContextPicker.tsx`: bounded selection of real sandbox products/customers/orders.

[Guided apps, provider boundaries and verification](../../../../docs/app-assistants.md).

## Multi-placement workbench

`assistant-placements.ts` compiles up to six selected areas into ordinary views/models in one package, retaining context-bound product/customer/order editors. `AppDesignWorkspace` composes the native preview and inspector; `AppPanelSizing` stores bounded presentation widths only. `AppControlThumbnail` provides passive illustrations. Stack/grid drag/drop and 12-column layout use the same Manifest blocks. `AppFormFields` edits the real selected model captions, not fake sample records.

`AppSettingsEditor` edits setting declarations only. Installed values use `admin/apps/AppSettings` and the existing encrypted app-secret owner. Settings do not enter templates, agent task exports or public native payloads. Their revisions/audit metadata describe credential rotation; they are live-only and are not configuration rollback/release units.

`AppLogicTopology` projects the existing bounded UI AST into the shared Flow Builder topology. It never persists or executes a second flow. `AppFlowNavigation` opens the native Flow Builder; native app saves already produce its `app.record.changed` event. `AppAgentDrawer` opens the shared `AppAgentPanel` on demand from every editing section. The native modal handles focus/Escape and keeps an unfinished prompt mounted while closed. The canvas stays in place; full task/import/provider controls use the same Manifest. The toolbox uses small illustrated rows (default 180 px; adjustable 148–280 px).

[Illustrated workbench and exact runtime/security boundaries](../../../../docs/app-studio-workspace.md).
