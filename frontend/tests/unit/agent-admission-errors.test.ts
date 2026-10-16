/** Native Studio transport retains actionable agent-stop and non-replenishing quota guidance in every UI language. */
import { expect, it, vi } from "vitest";
import { createStudioRequest } from "../../src/admin/shell/requests";
import { responseError } from "../../src/shared/i18n/errors-i18n";
const cases = [
  ["en-GB", "Shop agents are stopped", "allowance is exhausted"],
  [
    "de-DE",
    "Shop-Agenten sind gestoppt",
    "Kontingent dieses Agenten ist ausgeschöpft",
  ],
  ["fr-FR", "agents de la boutique sont arrêtés", "agent est épuisé"],
  ["es-ES", "agentes de la tienda están detenidos", "agente está agotado"],
] as const;
it.each(cases)(
  "explains stopped work and persistent budget exhaustion in %s",
  async (locale, stopText, quotaText) => {
    localStorage.setItem("rac-locale", locale);
    const diagnostic = "Shop agents are stopped by an administrator";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ errors: [{ detail: diagnostic, status: 403 }] }),
      }),
    );
    await expect(
      createStudioRequest(
        "fixture",
        "shop",
        locale,
      )("/api/agent/chat", { message: "Read only" }),
    ).rejects.toMatchObject({
      diagnostic,
      status: 403,
      message: expect.stringContaining(stopText),
    });
    const exhausted = responseError("Synthetic provider detail", 429, {
      kind: "quota_exceeded",
      pointer: "/agentBudget",
    });
    expect(exhausted.message).toContain(quotaText);
    expect(exhausted.message).not.toContain("Synthetic provider detail");
    expect(responseError("Synthetic provider detail", 429).message).not.toEqual(
      exhausted.message,
    );
  },
);
