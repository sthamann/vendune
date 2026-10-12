/** Pinned guest message admission bounds actual gateway calls and drops stale results when the surface changes. */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AppFrame from "../../src/shared/apps/AppFrame";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
async function mount() {
  const finish: ((v: unknown) => void)[] = [];
  const request = vi.fn((path: string) =>
    path === "__bundle"
      ? Promise.resolve({ html: "<p>Fixture</p>" })
      : new Promise((resolve) => finish.push(resolve)),
  );
  const props = {
    app: "example",
    url: "https://external.invalid/ui",
    request,
    allowedActions: ["list_records"],
    context: { productId: "one" },
  };
  const view = render(<AppFrame {...props} />, { wrapper: LocaleProvider });
  const frame = (await screen.findByTitle("example")) as HTMLIFrameElement;
  await act(async () => {});
  const source = frame.contentWindow!;
  const post = vi.spyOn(source, "postMessage");
  fireEvent.load(frame);
  const nonce = post.mock.calls.find(([v]) => v.type === "commerce.context")![0]
    .nonce;
  const send = (id: string) =>
    window.dispatchEvent(
      new MessageEvent("message", {
        source,
        origin: "null",
        data: {
          type: "commerce.action",
          id,
          nonce,
          action: "list_records",
          input: {},
        },
      }),
    );
  return { ...view, props, request, finish, source, post, send };
}
it("deduplicates in-flight IDs and admits at most eight pending guest calls", async () => {
  const v = await mount();
  act(() => {
    for (let i = 0; i < 12; i++) v.send("duplicate");
    for (let i = 0; i < 20; i++) v.send(`request_${i}`);
  });
  expect(v.request.mock.calls.filter(([p]) => p !== "__bundle")).toHaveLength(
    8,
  );
  await act(async () => v.finish.forEach((f) => f({ elements: [] })));
  act(() => v.send("after_completion"));
  expect(v.request.mock.calls.filter(([p]) => p !== "__bundle")).toHaveLength(
    9,
  );
});
it("does not send an old product result into the replacement surface", async () => {
  const v = await mount();
  act(() => v.send("old_read"));
  v.rerender(<AppFrame {...v.props} context={{ productId: "two" }} />);
  await waitFor(() =>
    expect(
      (screen.getByTitle("example") as HTMLIFrameElement).contentWindow !==
        v.source,
    ).toBe(true),
  );
  await act(async () => v.finish[0]({ privateRecord: "one" }));
  expect(
    v.post.mock.calls.some(([message]) => message.type === "commerce.result"),
  ).toBe(false);
});
