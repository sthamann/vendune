/** Explicit same-account resume reads the existing ledger, without adopting ambient identity or replaying writes. */
import {
  browserSessionCandidate,
  browserSessionMarker,
} from "../../shared/api/browser-session";
import { responseError } from "../../shared/i18n/errors-i18n";
import type { Session } from "../team/UsersManager";

export async function resumeBrowserSession(
  user: string,
  workspace: string,
  refusal: string,
): Promise<Session> {
  const proof = browserSessionCandidate();
  if (!/^[a-f0-9]{64}$/i.test(proof)) throw new Error(refusal);
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "x-veyndo-browser-session": "1",
      "x-veyndo-csrf": proof,
      "x-tenant": workspace,
    },
  });
  const session = await response.json();
  if (!response.ok || session.errors)
    throw responseError(
      session.errors?.[0]?.detail ?? response.statusText,
      response.status,
    );
  if (
    browserSessionCandidate() !== proof ||
    session.token !== browserSessionMarker ||
    session.user?.id !== user ||
    !Array.isArray(session.workspaces) ||
    !session.workspaces.some((item: { id: string }) => item.id === workspace)
  )
    throw new Error(refusal);
  return { ...session, browserSession: true, browserCsrf: proof };
}
