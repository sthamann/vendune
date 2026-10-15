/** Reviewing an editor draft must target the active sandbox, not the first unrelated environment. */
import { render, screen, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import EnvironmentManager from "../../src/admin/environments/EnvironmentManager";
it("opens release review for the active editor sandbox", async () => {
  const request = vi.fn(async (path: string) =>
    path.endsWith("/diff") ? { changes: [] } : { releases: [] },
  );
  render(
    <EnvironmentManager
      request={request}
      environments={[
        { id: "unrelated", name: "Other work" },
        { id: "design", name: "Shop design" },
      ]}
      initialId="design"
      onRefresh={async () => {}}
      onSelect={() => {}}
      role="owner"
    />,
  );
  expect(screen.getByRole("combobox")).toHaveValue("design");
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/environments/design/diff"),
  );
  expect(request).not.toHaveBeenCalledWith("/api/environments/unrelated/diff");
});
