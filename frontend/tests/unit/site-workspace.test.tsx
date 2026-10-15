/** Register app-owned visual workspace cases; real iframe behavior has a separate browser suite. */
import { vi } from "vitest";
vi.mock(
  "../../../extensions/apps/site-builder/studio/StorefrontCanvas",
  () => ({
    default: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
  }),
);
import "../../../extensions/apps/site-builder/tests/workspace-cases";
