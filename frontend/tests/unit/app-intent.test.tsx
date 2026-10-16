/** Merchant ideas hand off to the existing agent only on request, preserving examples and scope. */
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import ContentLanguagePicker from "../../src/shared/i18n/ContentLanguagePicker";
import AppCapabilityEditor from "../../src/admin/developer/AppCapabilityEditor";
import AppAgentPanel from "../../src/admin/developer/AppAgentPanel";
import { template } from "../../src/admin/developer/app-model";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocaleProvider>
    <ContentLanguage locales={["en-GB", "sv-SE"]} mainLocale="en-GB">
      {children}
    </ContentLanguage>
  </LocaleProvider>
);
it("shows a useful next step without treating a display app as a failed rule check", async () => {
  const user = userEvent.setup(),
    assist = vi.fn(),
    design = vi.fn();
  function Harness() {
    const [m, set] = useState(template());
    return (
      <AppCapabilityEditor
        manifest={m}
        onChange={set}
        onAssist={assist}
        onDesign={design}
      />
    );
  }
  render(<Harness />, { wrapper });
  expect(
    screen.getByRole("button", { name: "Continue with AI or a coding agent" }),
  ).toBeDisabled();
  expect(screen.queryByText(/No executable examples declared/)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Campaign banner" }));
  expect(assist).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Continue with AI or a coding agent" }),
  );
  expect(assist).toHaveBeenCalledWith(
    expect.stringContaining("campaign banner"),
  );
  await user.click(
    screen.getByRole("button", { name: "Design the interface yourself" }),
  );
  expect(design).toHaveBeenCalledOnce();
});
it("keeps optional checks collapsed and labels declared expectations without claiming a passed test", async () => {
  const user = userEvent.setup(),
    assist = vi.fn();
  render(
    <AppCapabilityEditor
      manifest={template()}
      onChange={vi.fn()}
      onAssist={assist}
    />,
    { wrapper },
  );
  expect(
    screen.getByText("Optional automatic rule checks").closest("details"),
  ).not.toHaveAttribute("open");
  await user.click(screen.getByText("Optional automatic rule checks"));
  expect(
    screen.getByText(/No automatic rule checks are stored yet/),
  ).toBeVisible();
  await user.click(
    screen.getByRole("button", {
      name: "Prepare test situations with an agent",
    }),
  );
  expect(assist).toHaveBeenCalledWith(
    expect.stringContaining("Do not invent a passing result"),
  );
});
it("edits an example idea in the fifth selected language without rewriting the main goal or existing cases", () => {
  let result = template();
  result.capability = {
    version: 1,
    intent: { en: "Original goal" },
    assumptions: [],
    examples: [],
  };
  render(
    <ContentLanguage
      locales={["en-GB", "sv-SE"]}
      mainLocale="en-GB"
      language="sv-SE"
    >
      <AppCapabilityEditor
        manifest={result}
        onChange={(m) => {
          result = m;
        }}
      />
    </ContentLanguage>,
    { wrapper: LocaleProvider },
  );
  fireEvent.click(screen.getByRole("button", { name: "Product advice" }));
  expect(result.capability!.intent.en).toBe("Original goal");
  expect(result.capability!.intent["sv-SE"]).toContain("materials");
  expect(result.capability!.examples).toEqual([]);
});
it("seeds the shared composer without running AI and exports the actual current manifest only after explicit submit", async () => {
  const request = vi.fn(async () => ({ task: "synthetic task" })),
    consumed = vi.fn(),
    user = userEvent.setup();
  const studio = {
    manifest: template(),
    env: "private-stage",
    providers: [],
    busy: false,
    proposal: null,
    run: async (f: () => Promise<void>) => f(),
  } as any;
  render(
    <AppAgentPanel
      studio={studio}
      request={request}
      requestSeed={{
        app: studio.manifest.id,
        environment: studio.env,
        prompt: "Prepare material advice",
      }}
      onRequestConsumed={consumed}
    />,
    { wrapper },
  );
  expect(
    screen.getByRole("textbox", { name: "What would you like to change?" }),
  ).toHaveValue("Prepare material advice");
  expect(request).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Codex" }));
  await user.click(screen.getByRole("button", { name: "Prepare agent task" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/developer/task", {
      environment: "private-stage",
      prompt: "Prepare material advice",
      agent: "codex",
      manifest: studio.manifest,
    }),
  );
  expect(consumed).toHaveBeenCalled();
});
it("rejects a delayed prompt from another app or sandbox without changing the current draft prompt", () => {
  const studio = {
    manifest: template(),
    env: "current-stage",
    providers: [],
    busy: false,
    proposal: null,
  } as any;
  const request = vi.fn(),
    consumed = vi.fn();
  const { rerender } = render(
    <AppAgentPanel studio={studio} request={request} />,
    { wrapper },
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "What would you like to change?" }),
    { target: { value: "Keep my work" } },
  );
  for (const [app, environment] of [
    ["other-app", studio.env],
    [studio.manifest.id, "other-stage"],
  ]) {
    rerender(
      <AppAgentPanel
        studio={studio}
        request={request}
        requestSeed={{ app, environment, prompt: "Wrong workspace" }}
        onRequestConsumed={consumed}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "What would you like to change?" }),
    ).toHaveValue("Keep my work");
  }
  expect(request).not.toHaveBeenCalled();
  expect(consumed).toHaveBeenCalledTimes(2);
});

it("explains missing main-language content and switches directly to correction without copying translations", async () => {
  const user = userEvent.setup();
  function Harness() {
    const [m, set] = useState(template());
    return (
      <>
        <ContentLanguagePicker />
        <AppCapabilityEditor manifest={m} onChange={set} />
      </>
    );
  }
  render(<Harness />, { wrapper });
  await user.selectOptions(screen.getByLabelText("Content language"), "sv-SE");
  await user.type(
    screen.getByLabelText("What should the app do?"),
    "Materialråd",
  );
  expect(screen.getByRole("alert")).toHaveTextContent("shop main language");
  await user.click(
    screen.getByRole("button", { name: "Complete the main language" }),
  );
  expect(screen.getByLabelText("Content language")).toHaveValue("en-GB");
  expect(screen.getByLabelText("What should the app do?")).toHaveValue("");
  expect(screen.getByLabelText("What should the app do?")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await user.type(
    screen.getByLabelText("What should the app do?"),
    "Material advice",
  );
  expect(screen.queryByRole("alert")).toBeNull();
  await user.selectOptions(screen.getByLabelText("Content language"), "sv-SE");
  expect(screen.getByLabelText("What should the app do?")).toHaveValue(
    "Materialråd",
  );
});
