/** URL-preserved register focus uses the existing authenticated Studio; re-login overlays remain outside its shell. */
import { useEffect, useState } from "react";
export function useCashierFocus() {
  const [active, setActive] = useState(
    new URLSearchParams(location.search).get("posMode") === "focus",
  );
  useEffect(() => {
    const sync = () =>
      setActive(
        new URLSearchParams(location.search).get("posMode") === "focus",
      );
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const toggle = () => {
    const url = new URL(location.href);
    if (active) url.searchParams.delete("posMode");
    else url.searchParams.set("posMode", "focus");
    history.replaceState(null, "", url);
    setActive(!active);
  };
  return {
    active,
    toggle,
    fullscreen: () => {
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => undefined);
      else
        void document.documentElement
          .requestFullscreen?.()
          .catch(() => undefined);
    },
  };
}
