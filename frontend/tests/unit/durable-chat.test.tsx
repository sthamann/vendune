/** Exercise the actual durable chat consumer: native queue transport, account boundaries and explicit CAS controls. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useChatTurns } from "../../src/admin/shell/useChatTurns";
import type { Message } from "../../src/admin/shell/studio-types";
function options() {
  return {
    scope: "shop-a:actor-a",
    request: vi.fn(
      async (_path: string, _body?: unknown): Promise<any> => ({}),
    ),
    connected: true,
    busy: false,
    id: undefined as string | undefined,
    setId: vi.fn(),
    messages: [] as Message[],
    setMessages: vi.fn(),
    draft: "Prepare my catalog",
    setDraft: vi.fn(),
    setPendingText: vi.fn(),
    provider: "platform",
    model: "",
    run: async (fn: () => Promise<void>) => fn(),
    refresh: vi.fn(async () => {}),
    onOpen: vi.fn(),
    onNew: vi.fn(),
  };
}
it("queues the native background turn and immediately retains its conversation", async () => {
  const o = options();
  const messages = [
    {
      id: 1,
      role: "user",
      content: o.draft,
      data: { runId: "run-a" },
      applied: false,
    },
  ];
  o.request.mockResolvedValue({
    conversationId: "conversation-a",
    messages,
    run: { taskId: "run-a", state: "queued", revision: 1 },
  });
  const hook = renderHook(() => useChatTurns(o));
  await act(() => hook.result.current.send());
  expect(o.request).toHaveBeenCalledWith(
    "/api/agent/chat",
    expect.objectContaining({ background: true, message: o.draft }),
  );
  expect(o.setId).toHaveBeenCalledWith("conversation-a");
  expect(o.setMessages).toHaveBeenCalledWith(messages);
  expect(o.setPendingText).toHaveBeenLastCalledWith("");
});
it("discards a late saved-run response after switching actor or shop", async () => {
  const o = options();
  o.id = "conversation-a";
  o.messages = [
    {
      id: 1,
      role: "user",
      content: "Private request",
      data: { runId: "run-a" },
      applied: false,
    },
  ];
  let finish!: (value: unknown) => void;
  o.request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const hook = renderHook(({ current }) => useChatTurns(current), {
    initialProps: { current: o },
  });
  await waitFor(() =>
    expect(o.request).toHaveBeenCalledWith("/api/agent/runs/run-a"),
  );
  const other = { ...options(), scope: "shop-b:actor-b" };
  hook.rerender({ current: other });
  await act(async () =>
    finish({ taskId: "run-a", state: "ready", revision: 5 }),
  );
  expect(o.setMessages).not.toHaveBeenCalled();
  expect(other.setMessages).not.toHaveBeenCalled();
  expect(hook.result.current.savedRun).toBeUndefined();
});
it("reuses the native idempotency key after a lost response and uses a new key for a different instruction", async () => {
  const o = options();
  o.request.mockRejectedValueOnce(new Error("Connection interrupted"));
  o.request.mockResolvedValue({
    conversationId: "conversation-a",
    messages: [],
    run: { taskId: "run-a", state: "queued", revision: 1 },
  });
  const hook = renderHook(() => useChatTurns(o));
  await act(async () => {
    await expect(hook.result.current.send()).rejects.toThrow(
      "Connection interrupted",
    );
  });
  const first = o.request.mock.calls[0][1] as { requestId: string };
  await act(() => hook.result.current.send());
  expect(o.request.mock.calls[1][1]).toEqual(
    expect.objectContaining({ requestId: first.requestId }),
  );
  o.draft = "A different request";
  await act(() => hook.result.current.send());
  expect(
    (o.request.mock.calls[2][1] as { requestId: string }).requestId,
  ).not.toBe(first.requestId);
  hook.unmount();
});
it("continuation sends explicit approval and the current native revision", async () => {
  const o = options();
  o.id = "conversation-a";
  o.messages = [
    {
      id: 1,
      role: "user",
      content: "Question",
      data: { runId: "run-a" },
      applied: false,
    },
  ];
  o.request.mockImplementation(async (path, body) => {
    if (body) return { taskId: "run-a", state: "queued", revision: 8 };
    if (path.includes("/conversations/")) return { messages: o.messages };
    return { taskId: "run-a", state: "uncertain", revision: 7 };
  });
  const hook = renderHook(() => useChatTurns(o));
  await waitFor(() =>
    expect(hook.result.current.savedRun?.state).toBe("uncertain"),
  );
  await act(() => hook.result.current.controlRun("resume"));
  expect(o.request).toHaveBeenCalledWith("/api/agent/runs/run-a/resume", {
    revision: 7,
    approve: true,
  });
  hook.unmount();
});
it("never restores an accepted instruction as a retry when only the subsequent refresh fails", async () => {
  const o = options();
  o.id = "conversation-a";
  o.request.mockResolvedValue({
    conversationId: o.id,
    messages: [],
    run: { taskId: "run-a", state: "queued", revision: 1 },
  });
  o.refresh.mockRejectedValueOnce(new Error("Refresh interrupted"));
  const hook = renderHook(() => useChatTurns(o));
  await act(async () => {
    await expect(hook.result.current.send()).rejects.toThrow(
      "Refresh interrupted",
    );
  });
  expect(o.setDraft).toHaveBeenCalledTimes(1);
  expect(o.setDraft).toHaveBeenCalledWith("");
  expect(hook.result.current.savedRun?.taskId).toBe("run-a");
  expect(o.request).toHaveBeenCalledTimes(1);
  hook.unmount();
});
