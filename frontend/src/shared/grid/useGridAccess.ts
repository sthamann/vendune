/** Current Studio rights only control presentation; each native list/model operation rechecks server authority. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../api/types";
export function useGridAccess(request: RequestFn) {
  const [rights, setRights] = useState<string[]>([]);
  useEffect(() => {
    let current = true;
    setRights([]);
    request("/api/auth/access")
      .then((v) => {
        if (current) setRights(v.permissions ?? []);
      })
      .catch(() => {
        if (current) setRights([]);
      });
    return () => {
      current = false;
    };
  }, [request]);
  return rights;
}
