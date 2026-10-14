/** Recovery uses the trusted server-selected identity entry, preserving the current editor in its original tab. */
import { useEffect, useState } from "react";
import { shopApi } from "../api/shop-api";
import { useSecurityText } from "../i18n/security-i18n";
export default function RecoveryLink() {
  const t = useSecurityText(),
    [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    void shopApi<{ available: boolean; url: string | null }>(
      "/api/auth/recovery",
    )
      .then((v) => {
        if (!active || !v.available || !v.url) return;
        const next = new URL(v.url);
        if (next.protocol === "https:" && !next.username && !next.password)
          setUrl(next.href);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {t("recover")}
    </a>
  ) : null;
}
