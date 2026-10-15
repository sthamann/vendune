/** Debounced server paging with generation fences: old searches and revoked reads never retain stale rows. */
import { consumePinnedView } from "./pinned-view";
import { useEffect, useState } from "react";
import type { RequestFn } from "../api/types";
import type { GridCriteria, GridQueryState } from "./types";
export function useGridPage(
  request: RequestFn,
  path: string,
  initial: GridCriteria = {},
  controlled?: GridQueryState,
) {
  const [ownCriteria, setCriteria] = useState<GridCriteria>(initial);
  const criteria = controlled?.criteria ?? ownCriteria;
  const [ownCursor, setOwnCursor] = useState("");
  const cursor = controlled?.cursor ?? ownCursor;
  const setCursor = (v: string) =>
    controlled?.onCursor ? controlled.onCursor(v) : setOwnCursor(v);
  const [next, setNext] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const criteria = consumePinnedView(
      new URLSearchParams(location.search).get("studio") ?? "",
    );
    if (criteria) {
      (controlled?.onCriteria ?? setCriteria)(criteria);
      setCursor("");
    }
  }, [request, path]);
  const signature = JSON.stringify(criteria);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    setRows([]);
    setNext("");
    const timer = setTimeout(
      () => {
        const params = new URLSearchParams({
          limit: "30",
          ...Object.fromEntries(
            Object.entries(criteria)
              .filter(([, v]) => v !== "")
              .map(([k, v]) => [k, String(v)]),
          ),
        });
        if (cursor) params.set("after", cursor);
        request(`${path}?${params}`)
          .then((v) => {
            if (current) {
              setRows(v.elements);
              setNext(v.nextCursor ?? "");
            }
          })
          .catch((e) => {
            if (current) setError(e.message);
          })
          .finally(() => {
            if (current) setLoading(false);
          });
      },
      criteria.query || criteria.search ? 220 : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [request, path, signature, cursor, refresh]);
  return {
    rows,
    criteria,
    onCriteria: (v: GridCriteria) => {
      setCursor("");
      if (controlled) controlled.onCriteria(v);
      else setCriteria(v);
    },
    next,
    previous: !!cursor,
    loading,
    error,
    onNext: () => setCursor(next),
    onFirst: () => setCursor(""),
    onRefresh: () => setRefresh((n) => n + 1),
  };
}
