/** Reopening autosaved work reattaches exact immutable history despite request order; changed drafts remain unsaved. */
import { renderHook, waitFor, act } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useAppStudio } from "../../src/admin/developer/useAppStudio";
import { template } from "../../src/admin/developer/app-model";
it.each([false, true])(
  "restores saved status only for an exact snapshot (modified=%s)",
  async (modified) => {
    const manifest = template(),
      draft = structuredClone(manifest);
    if (modified) draft.name.en = "Changed privately";
    let load!: (v: unknown) => void;
    const request = vi.fn(async (path: string) => {
      if (path === "/api/developer")
        return new Promise((resolve) => {
          load = resolve;
        });
      if (path === "/api/developer/drafts")
        return {
          drafts: [
            {
              id: manifest.id,
              manifest: draft,
              environment: "stage",
              revision: 1,
            },
          ],
        };
      if (path.startsWith("/api/developer/drafts/")) return { revision: 2 };
      throw Error(path);
    });
    const { result } = renderHook(() =>
      useAppStudio(
        request,
        "stage",
        vi.fn(async () => {}),
      ),
    );
    await waitFor(() =>
      expect(result.current.draftStorage.restored).toBe(true),
    );
    expect(result.current.saved).toBeNull();
    await act(async () =>
      load({
        builds: [
          {
            id: "saved",
            app: manifest.id,
            environment: "stage",
            state: "staged",
            version: manifest.version,
            digest: "digest",
            manifest,
          },
        ],
        archivedBuilds: [],
        providers: { providers: [] },
        mainLocale: "en-GB",
        locales: ["en-GB"],
      }),
    );
    await waitFor(() => expect(result.current.builds).toHaveLength(1));
    expect(result.current.dirty).toBe(modified);
    expect(result.current.saved?.id ?? null).toBe(modified ? null : "saved");
    expect(result.current.manifest.name.en).toBe(draft.name.en);
    expect(
      request.mock.calls.some(([p]) => p === "/api/developer/import"),
    ).toBe(false);
  },
);
