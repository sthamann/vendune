/** Agent authority is explicit, personal, revision-bound and fenced when the active shop changes. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import AgentControls from "../../src/admin/developer/api/AgentControls";
import IntegrationKeys from "../../src/admin/developer/api/IntegrationKeys";
import { agentBudget } from "../../src/admin/developer/api/AgentBudgetFields";
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocaleProvider>{children}</LocaleProvider>
);
it("delegates a named exact-model agent only after all explicit limits and rights are set", async () => {
  const user = userEvent.setup();
  const request = vi.fn(async (path: string, body?: any, method?: string) => {
    if (path === "/api/auth/access")
      return {
        personalSession: true,
        permissions: ["team.manage", "assistant.use", "catalog.read"],
      };
    if (method === "POST") return { key: "synthetic-agent-once" };
    return { elements: [] };
  });
  render(<IntegrationKeys request={request} />, { wrapper });
  await user.selectOptions(
    await screen.findByLabelText("Access purpose"),
    "agent",
  );
  await user.type(screen.getByLabelText("Key name"), "Catalog assistant");
  await user.click(screen.getByText(/\(catalog.read\)/));
  expect(screen.getByRole("button", { name: "Create key" })).toBeDisabled();
  await user.selectOptions(
    screen.getByLabelText("Approved provider"),
    "openai",
  );
  await user.type(screen.getByLabelText("Exact model name"), "test-model");
  await user.type(screen.getByLabelText("Lifetime token allowance"), "100000");
  await user.type(screen.getByLabelText("Allocation budget (USD)"), "2");
  await user.type(
    screen.getByLabelText("Ceiling price per million tokens (USD)"),
    "5",
  );
  await user.click(screen.getByRole("button", { name: "Create key" }));
  expect(request).toHaveBeenCalledWith(
    "/api/workspace/integrations",
    expect.objectContaining({
      agentBudget: {
        provider: "openai",
        model: "test-model",
        tokens: 100000,
        costMicros: 2000000,
        pricePerMillionMicros: 5000000,
      },
    }),
    "POST",
  );
  expect(await screen.findByLabelText("Integration keys")).toHaveValue(
    "synthetic-agent-once",
  );
  expect(
    agentBudget({
      provider: "openai",
      model: "test",
      tokens: "0",
      cost: "2",
      tariff: "5",
    }),
  ).toBeNull();
});
it("stops with explicit confirmation and the displayed revision; enabling does not restart old work", async () => {
  const user = userEvent.setup();
  let stopped = false;
  const request = vi.fn(async (path: string, body?: any, method?: string) => {
    if (path === "/api/auth/access")
      return { personalSession: true, permissions: ["ai.manage"] };
    if (method === "POST") {
      stopped = body.stopped;
      return { stopped, revision: body.revision + 1, liveShop: "shop" };
    }
    return { stopped, revision: 7, liveShop: "shop" };
  });
  render(<AgentControls request={request} />, { wrapper });
  await user.click(
    await screen.findByRole("button", { name: "Stop shop agents" }),
  );
  expect(request.mock.calls.filter((x) => x[2] === "POST")).toHaveLength(0);
  await user.click(
    screen.getAllByRole("button", { name: "Stop shop agents" }).at(-1)!,
  );
  await screen.findByText("Agents are stopped");
  expect(request).toHaveBeenCalledWith(
    "/api/agent/control",
    { stopped: true, revision: 7, approve: true },
    "POST",
  );
  await user.click(
    screen.getByRole("button", { name: "Allow new agent work" }),
  );
  expect(
    screen.getByText(
      "Allows new work. Cancelled runs do not restart automatically.",
    ),
  ).toBeVisible();
  await user.click(
    screen.getAllByRole("button", { name: "Allow new agent work" }).at(-1)!,
  );
  await screen.findByText("Agents may work");
  expect(request).toHaveBeenCalledWith(
    "/api/agent/control",
    { stopped: false, revision: 8, approve: true },
    "POST",
  );
});
it("hides stop controls from nonpersonal keys and discards late results from the previous shop", async () => {
  const denied = vi.fn(async () => ({
    personalSession: false,
    permissions: ["ai.manage"],
  }));
  const { rerender } = render(<AgentControls request={denied} />, { wrapper });
  await waitFor(() => expect(denied).toHaveBeenCalledOnce());
  expect(
    screen.queryByRole("button", { name: "Stop shop agents" }),
  ).not.toBeInTheDocument();
  let resolve!: (v: any) => void;
  const old = vi.fn(async (path: string) =>
    path === "/api/auth/access"
      ? { personalSession: true, permissions: ["ai.manage"] }
      : new Promise((r) => (resolve = r)),
  );
  rerender(<AgentControls request={old} />);
  await waitFor(() => expect(resolve).toBeDefined());
  const fresh = vi.fn(async (path: string) =>
    path === "/api/auth/access"
      ? { personalSession: true, permissions: ["ai.manage"] }
      : { stopped: true, revision: 2, liveShop: "new-shop" },
  );
  rerender(<AgentControls request={fresh} />);
  await screen.findByText("Agents are stopped");
  resolve({ stopped: false, revision: 8, liveShop: "old-shop" });
  await waitFor(() =>
    expect(screen.queryByText("Agents may work")).not.toBeInTheDocument(),
  );
});
it("never reveals a late created credential after changing shops", async () => {
  const user = userEvent.setup();
  let resolve!: (value: any) => void;
  const old = vi.fn(async (path: string, _body?: any, method?: string) => {
    if (path === "/api/auth/access")
      return {
        personalSession: true,
        permissions: ["team.manage", "catalog.read"],
      };
    if (method === "POST") return new Promise((r) => (resolve = r));
    return { elements: [] };
  });
  const { rerender } = render(<IntegrationKeys request={old} />, { wrapper });
  await user.type(await screen.findByLabelText("Key name"), "Old shop key");
  await user.click(await screen.findByText(/\(catalog.read\)/));
  await user.click(screen.getByRole("button", { name: "Create key" }));
  await waitFor(() => expect(resolve).toBeDefined());
  const fresh = vi.fn(async (path: string) =>
    path === "/api/auth/access"
      ? { personalSession: true, permissions: ["team.manage", "catalog.read"] }
      : { elements: [] },
  );
  rerender(<IntegrationKeys request={fresh} />);
  resolve({ key: "old-shop-secret-must-not-appear" });
  await waitFor(() =>
    expect(fresh).toHaveBeenCalledWith("/api/workspace/integrations"),
  );
  expect(screen.queryByLabelText("Integration keys")).not.toBeInTheDocument();
});
it("converts six-place USD allocations exactly without floating point multiplication", () => {
  const fields = {
    provider: "ollama",
    model: "fixture",
    tokens: "1000",
    cost: "0.000123",
    tariff: "0.100001",
  };
  expect(agentBudget(fields)).toMatchObject({
    costMicros: 123,
    pricePerMillionMicros: 100001,
  });
  expect(agentBudget({ ...fields, cost: "0.0000001" })).toBeNull();
  expect(agentBudget({ ...fields, cost: "1e2" })).toBeNull();
});
