/** A broken workspace cannot take down navigation; retry and scope change mount healthy views. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import WorkspaceBoundary from "../../src/shared/ui/WorkspaceBoundary";
import { lazy, Suspense } from "react";
it("contains a render error, retries and resets when the workspace key changes", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let broken = true;
  function View() {
    if (broken) throw new Error("Fixture failure");
    return <p>Healthy module</p>;
  }
  const shell = (key: string) => (
    <>
      <nav>Persistent navigation</nav>
      <WorkspaceBoundary
        key={key}
        title="Workspace unavailable"
        retryLabel="Retry"
      >
        <View />
      </WorkspaceBoundary>
    </>
  );
  const view = render(shell("orders"));
  expect(screen.getByRole("alert")).toHaveTextContent("Workspace unavailable");
  expect(screen.getByRole("navigation")).toHaveTextContent(
    "Persistent navigation",
  );
  broken = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  expect(screen.getByText("Healthy module")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  broken = true;
  view.rerender(shell("customers"));
  expect(screen.getByRole("alert")).toBeInTheDocument();
  broken = false;
  view.rerender(shell("apps"));
  expect(screen.getByText("Healthy module")).toBeInTheDocument();
});
it.each([
  "Failed to fetch dynamically imported module: https://app.example.test/assets/old.js?private=never",
  "error loading dynamically imported module: https://app.example.test/assets/old.js",
  "Importing a module script failed.",
  "Loading chunk customers failed",
])(
  "explains a rejected cached module without automatic reload or leaking its URL: %s",
  async (message) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    const MissingModule = lazy(() => Promise.reject(new TypeError(message)));
    render(
      <WorkspaceBoundary
        title="Generic request failure"
        retryLabel="Retry"
        onRetry={reload}
      >
        <Suspense fallback={<p>Loading fixture</p>}>
          <MissingModule />
        </Suspense>
      </WorkspaceBoundary>,
    );
    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("Diese Ansicht muss neu geladen werden");
    expect(notice).toHaveTextContent("ungespeicherte Änderungen");
    expect(notice).not.toHaveTextContent("private=never");
    expect(notice).not.toHaveTextContent("https://");
    expect(reload).not.toHaveBeenCalled();
    await userEvent
      .setup()
      .click(
        screen.getByRole("button", { name: "Aktuelle Version neu laden" }),
      );
    expect(reload).toHaveBeenCalledOnce();
  },
);
it("keeps a normal network/render failure on the ordinary retry path", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  function Broken(): never {
    throw new TypeError("Failed to fetch");
  }
  render(
    <WorkspaceBoundary title="Ordinary failure" retryLabel="Retry">
      <Broken />
    </WorkspaceBoundary>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Ordinary failure");
  expect(
    screen.queryByText("Diese Ansicht muss neu geladen werden"),
  ).not.toBeInTheDocument();
});
it("uses the host reload callback to recover a rejected cached lazy import", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const reload = vi.fn();
  function Broken(): never {
    throw new Error("Lazy fixture unavailable");
  }
  render(
    <WorkspaceBoundary
      title="New version available"
      retryLabel="Reload"
      onRetry={reload}
    >
      <Broken />
    </WorkspaceBoundary>,
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Reload" }));
  expect(reload).toHaveBeenCalledOnce();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
