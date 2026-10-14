/** Personal MFA settings use native revision checks and never become staged shop content. */
import { useEffect, useState } from "react";
import { shopApi } from "../api/shop-api";
import { useSecurityText } from "../i18n/security-i18n";
import type { Session } from "../api/account-types";
type Status = {
  enabled: boolean;
  revision: number;
  recoveryCodesRemaining: number;
};
type Setup = { secret: string; uri: string; revision: number };
export default function AccountSecurity({
  token,
  onLogout,
  onSession,
}: {
  token: string;
  onLogout: () => void;
  onSession: (session: Session) => void;
}) {
  const t = useSecurityText();
  const [status, setStatus] = useState<Status>(),
    [setup, setSetup] = useState<Setup>(),
    [codes, setCodes] = useState<string[]>(),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    shopApi<Status>("/api/auth/mfa", undefined, undefined, undefined, token)
      .then((v) => {
        if (active) setStatus(v);
      })
      .catch(() => {
        if (active) setError(t("retry"));
      });
    return () => {
      active = false;
    };
  }, [token]);
  const run = async (op: "enroll" | "confirm" | "disable") => {
    if (busy || !status) return;
    setBusy(true);
    setError("");
    try {
      const result = await shopApi<
        Setup & { recoveryCodes?: string[]; session?: Session }
      >(
        `/api/auth/mfa/${op}`,
        { password, code, revision: setup?.revision ?? status.revision },
        undefined,
        undefined,
        token,
      );
      if (op === "enroll") setSetup(result);
      else {
        setPassword("");
        setCode("");
        setSetup(undefined);
        if (result.recoveryCodes) {
          setCodes(result.recoveryCodes);
          if (result.session?.token) onSession(result.session);
        } else onLogout();
      }
    } catch {
      setError(t("retry"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="commerce-card account-security">
      <h2>{t("title")}</h2>
      <p>{t("hint")}</p>
      {error && <p role="alert">{error}</p>}
      {codes ? (
        <div role="status">
          <p>{t("recovery")}</p>
          <ul>
            {codes.map((c) => (
              <li key={c}>
                <code>{c}</code>
              </li>
            ))}
          </ul>
          <button className="studio-primary" onClick={onLogout}>
            {t("finish")}
          </button>
        </div>
      ) : (
        status && (
          <>
            <p>{t(status.enabled ? "enabled" : "disabled")}</p>
            {status.enabled && (
              <p>
                {t("remaining")}: {status.recoveryCodesRemaining}
              </p>
            )}
            <form
              className="account-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  status.enabled ? "disable" : setup ? "confirm" : "enroll",
                );
              }}
            >
              <label>
                {t("password")}
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {setup && (
                <>
                  <p>{t("setupHint")}</p>
                  <label>
                    {t("secret")}
                    <input readOnly autoComplete="off" value={setup.secret} />
                  </label>
                </>
              )}
              {(setup || status.enabled) && (
                <label>
                  {t("code")}
                  <input
                    autoComplete="one-time-code"
                    required
                    maxLength={32}
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                  />
                </label>
              )}
              <button className="studio-primary" disabled={busy}>
                {t(status.enabled ? "disable" : setup ? "confirm" : "enroll")}
              </button>
            </form>
          </>
        )
      )}
    </section>
  );
}
