/** Opaque-origin app UI. Its SDK can invoke only this app's declared, server-authorized actions. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { RequestFn } from "../api/types";
import { useAppText } from "../i18n/app-i18n";
export default function AppFrame({
  app,
  url,
  request,
  allowedActions,
  context: surfaceContext = {},
  mainLocale = "en-GB",
  locales = ["en-GB"],
  contentLocale,
}: {
  app: string;
  url: string;
  request: RequestFn;
  allowedActions: string[];
  context?: Record<string, unknown>;
  mainLocale?: string;
  locales?: string[];
  contentLocale?: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const { locale, a } = useAppText();
  const [bundle, setBundle] = useState<string>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setBundle(undefined);
    setError("");
    request("__bundle", {})
      .then((v) => {
        if (active) setBundle(v.html);
      })
      .catch(() => {
        if (active) setError(a("bundleUnavailable"));
      });
    return () => {
      active = false;
    };
  }, [request, app, url, locale, attempt]);
  const contextKey = JSON.stringify(surfaceContext);
  const nonce = useMemo(
    () => crypto.randomUUID(),
    [app, url, locale, request, bundle, contextKey],
  );
  const [height, setHeight] = useState(400);
  const context = () =>
    ref.current?.contentWindow?.postMessage(
      {
        type: "commerce.context",
        app,
        locale,
        contentLocale: contentLocale ?? locale,
        mainLocale,
        locales,
        nonce,
        context: surfaceContext,
      },
      "*",
    );
  useEffect(() => {
    let active = true;
    const pending = new Set<string>();
    const listener = async (event: MessageEvent) => {
      if (
        event.source !== ref.current?.contentWindow ||
        event.origin !== "null" ||
        event.data?.nonce !== nonce
      )
        return;
      if (event.data?.type === "commerce.resize") {
        const h = event.data.height;
        if (typeof h === "number" && Number.isFinite(h))
          setHeight(Math.max(180, Math.min(1200, h)));
        return;
      }
      if (event.data?.type !== "commerce.action") return;
      const { id, action, input } = event.data;
      if (
        typeof id !== "string" ||
        !id.length ||
        id.length > 100 ||
        typeof action !== "string" ||
        !/^[a-z][a-z0-9_]{0,31}$/.test(action) ||
        !allowedActions.includes(action)
      )
        return;
      if (pending.has(id)) return;
      const source = ref.current?.contentWindow;
      const reply = (value: Record<string, unknown>) => {
        if (active && source === ref.current?.contentWindow)
          source?.postMessage(
            { type: "commerce.result", nonce, id, ...value },
            "*",
          );
      };
      if (pending.size >= 8) {
        reply({ error: "APP_BRIDGE_LIMIT" });
        return;
      }
      pending.add(id);
      try {
        if (JSON.stringify(input ?? {}).length > 65536)
          throw Error("APP_BRIDGE_INPUT_LIMIT");
        const result = await request(
          `/api/apps/${app}/actions/${action}`,
          input ?? {},
        );
        reply({ result });
      } catch (e) {
        reply({ error: (e as Error).message.slice(0, 2000) });
      } finally {
        pending.delete(id);
      }
    };
    window.addEventListener("message", listener);
    return () => {
      active = false;
      window.removeEventListener("message", listener);
    };
  }, [app, nonce, request, allowedActions]);
  useEffect(context, [
    nonce,
    surfaceContext,
    mainLocale,
    locales,
    contentLocale,
  ]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>{a("refresh")}</button>
      </div>
    );
  if (!bundle) return <p role="status">{a("bundleLoading")}</p>;
  const policy =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'";
  return (
    <iframe
      key={nonce}
      ref={ref}
      srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}">${bundle}`}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      title={app}
      className="app-frame"
      loading="lazy"
      style={{ height }}
      onLoad={context}
    />
  );
}
