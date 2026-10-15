/** Durable chat commands reuse native conversations; late responses cannot cross an account/shop/stage boundary. */
import { useEffect, useRef, useState } from "react";
import type { Message, RequestFn } from "./studio-types";
export type SavedRun = {
  taskId: string;
  state: "queued" | "running" | "ready" | "failed" | "uncertain" | "cancelled";
  revision: number;
  completedModelSteps?: number;
  error?: { code?: string; detail?: string };
};
type Options = {
  scope: string;
  request: RequestFn;
  connected: boolean;
  busy: boolean;
  id?: string;
  setId: (id?: string) => void;
  messages: Message[];
  setMessages: (v: Message[]) => void;
  draft: string;
  setDraft: (v: string) => void;
  setPendingText: (v: string) => void;
  provider: string;
  model: string;
  run: (operation: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
  onOpen: () => void;
  onNew: () => void;
};
export function useChatTurns(options: Options) {
  const pendingRequest = useRef<
    { fingerprint: string; id: string } | undefined
  >(undefined);
  const latest = useRef(options);
  latest.current = options;
  const [saved, setSaved] = useState<{
    scope: string;
    id?: string;
    value: SavedRun;
  }>();
  const [pollError, setPollError] = useState<{
    scope: string;
    id?: string;
    runId: string;
  }>();
  const runId = [...options.messages].reverse().find((m) => m.data?.runId)?.data
    .runId as string | undefined;
  const savedRun =
    saved?.scope === options.scope && saved.id === options.id
      ? saved.value
      : undefined;
  const active = savedRun?.state === "queued" || savedRun?.state === "running";
  const same = (scope: string, id?: string) =>
    latest.current.scope === scope && latest.current.id === id;
  useEffect(() => {
    if (!runId || !options.id || !options.connected) return;
    const { scope, id, request } = options;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const value: SavedRun = await request(`/api/agent/runs/${runId}`);
        if (cancelled || !same(scope, id)) return;
        setPollError(undefined);
        setSaved({ scope, id, value });
        if (value.state === "queued" || value.state === "running") {
          timer = setTimeout(poll, 1500);
        } else {
          const conversation = await request(`/api/agent/conversations/${id}`);
          if (!cancelled && same(scope, id))
            latest.current.setMessages(conversation.messages);
        }
      } catch {
        if (!cancelled && same(scope, id)) {
          setPollError({ scope, id, runId });
          timer = setTimeout(poll, 5000);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    options.scope,
    options.id,
    options.connected,
    options.request,
    runId,
    savedRun?.state === "queued",
  ]);
  const load = async (id: string) => {
    const o = latest.current;
    const scope = o.scope;
    const value = await o.request(`/api/agent/conversations/${id}`);
    if (latest.current.scope !== scope) return;
    o.setId(value.conversationId);
    o.setMessages(value.messages);
    setSaved(value.run ? { scope, id, value: value.run } : undefined);
    o.onOpen();
  };
  const newChat = () => {
    const o = latest.current;
    pendingRequest.current = undefined;
    o.setId(undefined);
    o.setMessages([]);
    o.setDraft("");
    setSaved(undefined);
    o.onNew();
  };
  const send = async () => {
    const o = latest.current;
    if (!o.draft.trim() || o.busy || active || !o.connected) return;
    const text = o.draft;
    const scope = o.scope;
    const originalId = o.id;
    const fingerprint = JSON.stringify([
      scope,
      originalId,
      text,
      o.provider,
      o.model,
    ]);
    if (pendingRequest.current?.fingerprint !== fingerprint)
      pendingRequest.current = { fingerprint, id: crypto.randomUUID() };
    const requestId = pendingRequest.current.id;
    o.setPendingText(text);
    o.setDraft("");
    await o.run(async () => {
      let accepted = false;
      try {
        const value = await o.request("/api/agent/chat", {
          message: text,
          conversationId: originalId,
          background: true,
          requestId,
          inference: { provider: o.provider, model: o.model || undefined },
        });
        accepted = true;
        if (!same(scope, originalId)) return;
        pendingRequest.current = undefined;
        o.setId(value.conversationId);
        o.setMessages(value.messages);
        setSaved({ scope, id: value.conversationId, value: value.run });
        await o.refresh();
      } catch (e) {
        if (!accepted && same(scope, originalId)) o.setDraft(text);
        throw e;
      } finally {
        if (latest.current.scope === scope) o.setPendingText("");
      }
    });
  };
  const controlRun = async (action: "resume" | "cancel") => {
    const o = latest.current;
    if (!savedRun) return;
    const value = await o.request(
      `/api/agent/runs/${savedRun.taskId}/${action}`,
      { revision: savedRun.revision, approve: true },
    );
    if (same(o.scope, o.id)) setSaved({ scope: o.scope, id: o.id, value });
  };
  const progressUnavailable =
    pollError?.scope === options.scope &&
    pollError.id === options.id &&
    pollError.runId === runId;
  return {
    load,
    newChat,
    send,
    savedRun,
    controlRun,
    active,
    progressUnavailable,
  };
}
