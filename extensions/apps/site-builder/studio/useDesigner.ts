/** Explicit native saves and scope-safe reads; local undo never bypasses record CAS or staging review. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import {
  appPath,
  pageFields,
  normalizePage,
  newPage,
  type Page,
} from "../model";
import type { SiteProduct } from "../Renderer";
export type Context = {
  channels: { id: string; data: { name: Record<string, string> } }[];
  locales: string[];
  mainLocale: string;
  installed: string[];
  catalogue: {
    elements: SiteProduct[];
    hasMore: boolean;
    nextCursor: string | null;
  };
};
export default function useDesigner(request: RequestFn, workspace: string) {
  const [context, setContext] = useState<Context>(),
    [pages, setPages] = useState<Page[]>([]),
    [draft, setDraft] = useState<Page>(),
    [channel, setChannel] = useState(
      new URLSearchParams(location.search).get("designChannel") ?? "default",
    );
  const [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [loaded, setLoaded] = useState(false),
    [more, setMore] = useState<string | null>(null);
  const [past, setPast] = useState<Page[]>([]),
    [future, setFuture] = useState<Page[]>([]),
    scope = useRef(0),
    baseline = useRef("");
  const [catalogueLanguage, setCatalogueLanguage] = useState("");
  const contextScope = useRef("");
  contextScope.current = `${workspace}:${channel}:${catalogueLanguage}`;
  const readContext = async (query = "") =>
    request(
      `/api/merchant/site/context?channel=${encodeURIComponent(channel)}${query ? `&query=${encodeURIComponent(query)}` : ""}${catalogueLanguage ? `&locale=${encodeURIComponent(catalogueLanguage)}` : ""}`,
    ) as Promise<Context>;
  const load = async () => {
    const current = ++scope.current;
    setError("");
    setLoaded(false);
    try {
      const c = await readContext();
      if (current !== scope.current) return;
      setContext(c);
      const rows = c.installed.includes("site_builder")
        ? await request(`${appPath}editor_pages`, { limit: 100 })
        : { elements: [], nextCursor: null };
      if (current !== scope.current) return;
      setPages(rows.elements.map(normalizePage));
      setMore(rows.nextCursor ?? null);
      setLoaded(true);
    } catch (e) {
      if (current === scope.current) setError((e as Error).message);
    }
  };
  useEffect(() => {
    setDraft(undefined);
    setPast([]);
    setFuture([]);
    void load();
    return () => {
      scope.current++;
    };
  }, [workspace, request]);
  useEffect(() => {
    if (!context) return;
    let active = true;
    void readContext()
      .then((c) => {
        if (active) setContext(c);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [channel, catalogueLanguage]);
  const dirty = !!draft && baseline.current !== JSON.stringify(draft);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const open = (page: Page) => {
    page = normalizePage(page);
    setDraft(page);
    baseline.current = page.revision ? JSON.stringify(page) : "";
    setSelected("");
    setPast([]);
    setFuture([]);
    setSaved(false);
  };
  const edit = (page: Page) => {
    if (draft) setPast((p) => [...p, draft].slice(-30));
    if (page.channel === "*" && channel !== "*") {
      page = { ...page, id: newPage(channel, "", "").id, revision: 0, channel };
    }
    setFuture([]);
    setDraft(page);
    setSaved(false);
  };
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    const current = scope.current;
    try {
      const result = await request(`${appPath}save_page`, {
        id: draft.id,
        revision: draft.revision,
        fields: pageFields(draft),
      });
      if (current !== scope.current) return;
      const next = {
        ...result.fields,
        id: result.id,
        revision: result.revision,
      } as Page;
      setDraft(next);
      baseline.current = JSON.stringify(next);
      setPages((rows) => [...rows.filter((p) => p.id !== next.id), next]);
      setSaved(true);
    } catch (e) {
      if (current === scope.current) setError((e as Error).message);
    } finally {
      if (current === scope.current) setBusy(false);
    }
  };
  return {
    context,
    setContext,
    setCatalogueLanguage,
    pages,
    setPages,
    draft,
    selected,
    setSelected,
    channel,
    changeChannel: (next: string) => {
      setChannel(next);
      setDraft(undefined);
      setSelected("");
      setPast([]);
      setFuture([]);
      setSaved(false);
    },
    search: async (query: string) => {
      const current = scope.current;
      const context = contextScope.current;
      try {
        const c = await readContext(query);
        if (current === scope.current && context === contextScope.current)
          setContext(c);
      } catch (e) {
        if (current === scope.current) setError((e as Error).message);
      }
    },
    error,
    setError,
    busy,
    loaded,
    saved,
    dirty,
    open,
    close: () => {
      setDraft(undefined);
      baseline.current = "";
      setSelected("");
    },
    edit,
    save,
    load,
    readContext,
    more,
    loadMore: async () => {
      const current = scope.current;
      try {
        const value = await request(`${appPath}editor_pages`, {
          limit: 100,
          after: more,
        });
        if (current !== scope.current) return;
        setPages((rows) => [...rows, ...value.elements]);
        setMore(value.nextCursor ?? null);
      } catch (e) {
        if (current === scope.current) setError((e as Error).message);
      }
    },
    canUndo: !!past.length,
    canRedo: !!future.length,
    undo: () => {
      const page = past.at(-1);
      if (!page || !draft) return;
      setFuture((f) => [draft, ...f]);
      setPast((p) => p.slice(0, -1));
      setDraft(page);
    },
    redo: () => {
      const page = future[0];
      if (!page || !draft) return;
      setPast((p) => [...p, draft]);
      setFuture((f) => f.slice(1));
      setDraft(page);
    },
  };
}
export type Designer = ReturnType<typeof useDesigner>;
