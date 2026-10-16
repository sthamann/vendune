# Site builder UI regressions

The shared frontend runner registers these app-owned cases through a thin host adapter. The host replaces the browser viewport for component tests; real browser acceptance separately verifies the isolated native preview and editing. No product implementation or app fixtures are copied into the Core.

`interactions-cases.tsx` covers palette insertion/order, opaque drag tokens, stale channel changes, full-page caps, removal, native-home first-insertion undo and read-only callers. `design-reference-cases.tsx` covers local screenshot reduction, dimension rejection, resource cleanup and invalid-upload recovery. `workspace-cases.tsx` exercises planner URL payloads, opt-in content copying and late proposal rejection. These are component/contract checks; they do not prove a model’s visual quality.
