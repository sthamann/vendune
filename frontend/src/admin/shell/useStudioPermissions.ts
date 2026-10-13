/** Recheck current server grants; discard previously loaded views when a live role changes. */
import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RequestFn } from "./studio-types";
export function useStudioPermissions(
  active: boolean,
  paused: boolean,
  connected: boolean,
  request: RequestFn,
  rights: string[],
  setRights: Dispatch<SetStateAction<string[]>>,
  invalidate: () => void,
) {
  const previous = useRef("");
  const callback = useRef(invalidate);
  callback.current = invalidate;
  useEffect(() => {
    const key = JSON.stringify(rights);
    if (previous.current && previous.current !== key) callback.current();
    previous.current = connected ? key : "";
  }, [rights, connected]);
  useEffect(() => {
    if (!active) {
      setRights([]);
      callback.current();
      return;
    }
    if (paused) return;
    let mounted = true;
    const refresh = () => {
      if (document.visibilityState !== "hidden")
        void request("/api/auth/access")
          .then((v) => {
            if (mounted)
              setRights((old) =>
                JSON.stringify(old) === JSON.stringify(v.permissions)
                  ? old
                  : v.permissions,
              );
          })
          .catch(() => {
            if (mounted) setRights([]);
          });
    };
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [active, paused, request, setRights]);
}
