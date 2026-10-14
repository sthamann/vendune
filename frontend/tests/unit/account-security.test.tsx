/** Factor views retain the native session boundary and keep enrollment secrets out of storage. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import Challenge from "../../src/shared/auth/AuthenticationChallenge";
import AccountSecurity from "../../src/shared/auth/AccountSecurity";
const challenge = {
  mfaRequired: true as const,
  challengeToken: "pending-factor",
  expiresIn: 300,
};
function response(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
it("a pending factor is submitted only to verification and never persisted as a bearer", async () => {
  const f = vi.fn(async (_url: unknown, _init?: RequestInit) =>
    response({ token: "verified-personal-session" }),
  );
  vi.stubGlobal("fetch", f);
  const accept = vi.fn(),
    cancel = vi.fn(),
    u = userEvent.setup();
  render(
    <Challenge challenge={challenge} onSession={accept} onCancel={cancel} />,
    { wrapper: LocaleProvider },
  );
  expect(accept).not.toHaveBeenCalled();
  await u.type(
    screen.getByLabelText("Authenticator or recovery code"),
    "123456",
  );
  await u.click(screen.getByRole("button", { name: "Verify and sign in" }));
  await waitFor(() =>
    expect(accept).toHaveBeenCalledWith({ token: "verified-personal-session" }),
  );
  expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toEqual({
    challengeToken: "pending-factor",
    code: "123456",
  });
  expect(JSON.stringify(localStorage)).not.toContain(challenge.challengeToken);
  expect(JSON.stringify(sessionStorage)).not.toContain(
    challenge.challengeToken,
  );
});
it("malformed verification never admits a session and remains cancellable", async () => {
  const f = vi.fn(async () => response({ mfaRequired: true }));
  vi.stubGlobal("fetch", f);
  const accept = vi.fn(),
    cancel = vi.fn(),
    u = userEvent.setup();
  render(
    <Challenge challenge={challenge} onSession={accept} onCancel={cancel} />,
    { wrapper: LocaleProvider },
  );
  await u.type(screen.getByLabelText("Authenticator or recovery code"), "bad");
  await u.click(screen.getByRole("button", { name: "Verify and sign in" }));
  await screen.findByRole("alert");
  expect(accept).not.toHaveBeenCalled();
  await u.click(screen.getByRole("button", { name: "Back to sign-in" }));
  expect(cancel).toHaveBeenCalledOnce();
});
it("enrollment passes native revision, shows recovery codes once and clears password/code", async () => {
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    if (!init?.body)
      return response({
        enabled: false,
        revision: 0,
        recoveryCodesRemaining: 0,
      });
    if (url.endsWith("/enroll"))
      return response({
        secret: "SYNTHETIC-SETUP",
        uri: "otpauth://fixture",
        revision: 1,
      });
    return response({
      recoveryCodes: ["synthetic-recovery"],
      session: { token: "new-factor-session" },
    });
  });
  vi.stubGlobal("fetch", f);
  const accept = vi.fn(),
    logout = vi.fn(),
    u = userEvent.setup();
  render(
    <AccountSecurity
      token="old-personal-session"
      onSession={accept}
      onLogout={logout}
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByText("Two-factor authentication not enabled");
  await u.type(
    screen.getByLabelText("Current password"),
    "Synthetic-password-2026",
  );
  await u.click(screen.getByRole("button", { name: "Set up authenticator" }));
  await screen.findByDisplayValue("SYNTHETIC-SETUP");
  await u.type(
    screen.getByLabelText("Authenticator or recovery code"),
    "123456",
  );
  await u.click(screen.getByRole("button", { name: "Activate protection" }));
  await screen.findByText("synthetic-recovery");
  expect(accept).toHaveBeenCalledWith({ token: "new-factor-session" });
  expect(JSON.parse(f.mock.calls.at(-1)![1]!.body as string).revision).toBe(1);
  expect(screen.queryByLabelText("Current password")).toBeNull();
  expect(JSON.stringify(localStorage)).not.toContain("synthetic-recovery");
});
