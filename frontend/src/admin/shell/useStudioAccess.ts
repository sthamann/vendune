/** Central Studio identity boundary: initial login, expiry suspension and same-account resume. */
import { useCallback, useEffect, useRef, useState } from "react";
import { shopApi } from "../../shared/api/shop-api";
import {
  activateBrowserSession,
  browserSessionMarker,
  forgetLegacyCredentials,
} from "../../shared/api/browser-session";
import {
  suspendMerchantToken,
  resumeMerchantToken,
} from "../../shared/api/merchant-session";
import { useConnectedText } from "../../shared/i18n/connected-i18n";
import type { Session } from "../team/UsersManager";
import type { RequestFn } from "./studio-types";
import { useStudioSession } from "./useStudioSession";
import { resumeBrowserSession } from "./resume-browser-session";
import {
  isMfaChallenge,
  type MfaChallenge,
} from "../../shared/auth/AuthenticationChallenge";

function route(hash: string) {
  const url = new URL(location.href);
  url.hash = hash;
  history.replaceState(null, "", url);
}
export function useStudioAccess(
  token: string,
  setToken: (v: string) => void,
  workspace: string,
  setWorkspace: (v: string) => void,
  connected: boolean,
  liveRequest: RequestFn,
) {
  const { x } = useConnectedText();
  const [identity, setIdentity] = useState<Session>();
  const [challenge, setChallenge] = useState<MfaChallenge>();
  const current = useRef(identity);
  const generation = useRef(0);
  current.current = identity;
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(!!token);
  const [redeeming, setRedeeming] = useState(() =>
    new URL(location.href).searchParams.has("login_ticket"),
  );
  const [error, setError] = useState("");
  const [verified, setVerified] = useState("");
  const [retry, setRetry] = useState(0);
  const expire = useCallback(() => {
    suspendMerchantToken(token);
    sessionStorage.removeItem("rac-user-token");
    if (current.current) setExpired(true);
    else {
      setToken("");
      route("login");
    }
  }, [setToken, token]);
  useStudioSession(token, connected && !expired, liveRequest, expire);
  useEffect(() => {
    // A handoff can rotate the shared cookie while an earlier tab is signed in.
    // Do not start a workspace connection using that preceding session.
    if (redeeming) return;
    if (!token) {
      setIdentity(undefined);
      setVerified("");
      setChecking(false);
      route("login");
      return;
    }
    let active = true;
    const attempt = ++generation.current;
    setChecking(true);
    void shopApi<Session>(
      "/api/auth/session",
      undefined,
      undefined,
      undefined,
      token,
    )
      .then((session) => {
        if (!active || attempt !== generation.current) return;
        if (current.current && session.user.id !== current.current.user.id)
          throw new Error(x("resumeSameAccount"));
        if (!session.workspaces.some((w) => w.id === workspace))
          throw new Error(x("studioShopAccess"));
        activateBrowserSession(session);
        resumeMerchantToken(token);
        const credential =
          session.token === browserSessionMarker ? browserSessionMarker : token;
        if (credential === browserSessionMarker) {
          setToken(credential);
        }
        forgetLegacyCredentials();
        setIdentity(session);
        setVerified(JSON.stringify([credential, workspace]));
        setExpired(false);
        setError("");
        route("merchant");
      })
      .catch((e) => {
        if (active && attempt === generation.current) setError(e.message);
      })
      .finally(() => {
        if (active && attempt === generation.current) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [token, workspace, retry, redeeming]);
  const accept = async (session: Session | MfaChallenge) => {
    if (isMfaChallenge(session)) {
      setChallenge(session);
      return;
    }
    if (!session.token) throw new Error(x("studioSignIn"));
    if (identity && session.user.id !== identity.user.id)
      throw new Error(x("resumeSameAccount"));
    const member = session.workspaces.find((w) => w.id === workspace);
    if (!member && identity) throw new Error(x("studioShopAccess"));
    const target =
      member?.id ??
      session.workspaces.find((w) => w.id === session.workspace)?.id;
    if (!target) throw new Error(x("studioShopAccess"));
    generation.current++;
    activateBrowserSession(session);
    resumeMerchantToken(session.token);
    forgetLegacyCredentials();
    sessionStorage.setItem("rac-user-workspace", target);
    const url = new URL(location.href);
    if (workspace !== target) {
      url.searchParams.delete("entity");
      url.searchParams.delete("studio");
    }
    url.searchParams.set("shop", target);
    url.hash = "merchant";
    history.replaceState(null, "", url);
    setWorkspace(target);
    setToken(session.token);
    setIdentity(session);
    setVerified(JSON.stringify([session.token, target]));
    setExpired(false);
    setError("");
    setChallenge(undefined);
  };
  useEffect(() => {
    const url = new URL(location.href);
    const ticket = url.searchParams.get("login_ticket");
    if (!ticket) return;
    url.searchParams.delete("login_ticket");
    history.replaceState(null, "", url);
    setChecking(true);
    void shopApi<Session | MfaChallenge>("/api/auth/redeem", { ticket })
      .then(accept)
      .catch((e) => setError(e.message))
      .finally(() => {
        setRedeeming(false);
        setChecking(false);
      });
  }, []);
  const logout = async () => {
    try {
      await liveRequest("/api/auth/logout", {});
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    forgetLegacyCredentials();
    generation.current++;
    sessionStorage.removeItem("rac-user-token");
    sessionStorage.removeItem("rac-user-workspace");
    setToken("");
    setIdentity(undefined);
    setVerified("");
    setExpired(false);
    setChallenge(undefined);
    setError("");
    route("login");
    // Explicitly leaving discards private in-memory editors; reauthentication does not.
    window.location.reload();
  };
  return {
    identity,
    challenge,
    cancelChallenge: () => setChallenge(undefined),
    expired,
    checking,
    error,
    accept,
    resume: async () => {
      if (!identity) throw new Error(x("resumeSameAccount"));
      const attempt = generation.current;
      const session = await resumeBrowserSession(
        identity.user.id,
        workspace,
        x("resumeSameAccount"),
      );
      if (generation.current !== attempt)
        throw new Error(x("resumeSameAccount"));
      await accept(session);
    },
    logout,
    active:
      !!identity &&
      verified === JSON.stringify([token, workspace]) &&
      !expired &&
      !redeeming,
    retry: () => setRetry((v) => v + 1),
  };
}
