/** Load the current shop's content-language context and ignore replies after the workspace changes. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";

export function useAutomationLanguages(
  request: RequestFn,
  onError: (message: string) => void,
) {
  const [languages, setLanguages] = useState<{
    locales: string[];
    mainLocale: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    request("/store-api/context")
      .then((value) => {
        if (active)
          setLanguages({
            mainLocale: value.mainLocale,
            locales: value.availableLocales,
          });
      })
      .catch((error) => {
        if (active) onError(error.message);
      });
    return () => {
      active = false;
    };
  }, [request, onError]);
  return languages;
}
