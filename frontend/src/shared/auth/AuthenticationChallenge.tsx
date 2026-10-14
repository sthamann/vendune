/** A pending second factor never enters merchant or operator session storage. */
import { useState } from "react";
import { shopApi } from "../api/shop-api";
import { useSecurityText } from "../i18n/security-i18n";
import type { Session } from "../api/account-types";
export type MfaChallenge = {
  mfaRequired: true;
  challengeToken: string;
  expiresIn: number;
};
export function isMfaChallenge(value: unknown): value is MfaChallenge {
  return (
    !!value &&
    typeof value === "object" &&
    "mfaRequired" in value &&
    value.mfaRequired === true &&
    "challengeToken" in value &&
    typeof value.challengeToken === "string"
  );
}
export default function AuthenticationChallenge({
  challenge,
  onSession,
  onCancel,
}: {
  challenge: MfaChallenge;
  onSession: (session: Session) => void | Promise<void>;
  onCancel: () => void;
}) {
  const t = useSecurityText();
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="account-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        void shopApi<Session>("/api/auth/mfa/verify", {
          challengeToken: challenge.challengeToken,
          code,
        })
          .then(async (session) => {
            if (!session.token) throw new Error(t("retry"));
            setCode("");
            await onSession(session);
          })
          .catch(() => setError(t("retry")))
          .finally(() => setBusy(false));
      }}
    >
      <h2>{t("challenge")}</h2>
      <p>{t("challengeHint")}</p>
      <label>
        {t("code")}
        <input
          autoComplete="one-time-code"
          name="code"
          maxLength={32}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="studio-primary" disabled={busy}>
        {t("verify")}
      </button>
      <button
        type="button"
        className="studio-secondary"
        disabled={busy}
        onClick={onCancel}
      >
        {t("cancel")}
      </button>
    </form>
  );
}
