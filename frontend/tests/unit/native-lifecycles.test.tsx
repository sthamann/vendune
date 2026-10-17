/** The visual editor and agent JSON share one contract; native actions retain server guard decisions. */
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AppConnections from "../../src/admin/developer/AppConnections";
import AppNativeLifecycles from "../../src/admin/developer/AppNativeLifecycles";
import OrderWorkflow from "../../src/admin/orders/OrderWorkflow";
import { template, compile } from "../../src/admin/developer/app-model";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import type { Manifest } from "../../src/shared/apps/native/types";
import example from "../../../extensions/apps/production-review/manifest.json";
it("retains lifecycle rules and source declarations across ordinary visual compilation", () => {
  const m = example as Manifest;
  expect(compile(m).lifecycles).toEqual(m.lifecycles);
  expect(compile(m).permissions).toContain("commerce.lifecycle");
});
it("adds a connected workflow, edits a single content language and updates edges when a state is renamed", () => {
  let current = template();
  function Harness() {
    const [m, set] = useState(current);
    current = m;
    return (
      <ContentLanguage
        mainLocale="it-IT"
        locales={["it-IT", "en-GB", "de-DE", "fr-FR", "es-ES"]}
      >
        <AppNativeLifecycles manifest={m} onChange={set} />
      </ContentLanguage>
    );
  }
  render(<Harness />, { wrapper: LocaleProvider });
  fireEvent.click(
    screen.getByRole("button", { name: "Add a review workflow" }),
  );
  expect(current.lifecycles?.[0].transitions).toHaveLength(3);
  expect(current.permissions).toContain("commerce.lifecycle");
  expect(current.lifecycles?.[0].transitions[0].replaces).toBe("complete");
  expect(current.lifecycles?.[0].transitions[1].to).toBe("completed");
  fireEvent.change(screen.getByRole("textbox", { name: "Technical ID" }), {
    target: { value: "material_review" },
  });
  expect(current.lifecycles?.[0].transitions[0].to).toBe("material_review");
  expect(current.lifecycles?.[0].transitions[1].from).toBe("material_review");
  expect(screen.getAllByRole("textbox", { name: "Review step" })).toHaveLength(
    1,
  );
});
it("renders regional lifecycle labels with the shop main-language fallback and obeys native denials", () => {
  const execute = vi.fn();
  render(
    <OrderWorkflow
      order={{
        state: "quality",
        workflow: {
          mainLocale: "it-IT",
          states: [{ id: "quality", label: { "it-IT": "Controllo qualità" } }],
          actions: [
            {
              id: "approve",
              kind: "order",
              from: "quality",
              state: "completed",
              label: { "it-IT": "Approva completamento" },
              enabled: false,
              reason: "lifecycleGuard",
            },
          ],
        },
      }}
      busy={false}
      canEdit={true}
      onAction={execute}
    />,
    { wrapper: LocaleProvider },
  );
  expect(
    screen.getByRole("heading", { name: "Controllo qualità" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: /Approva completamento/ }),
  ).toBeDisabled();
  expect(
    screen.getByText("The app’s transition checks are not satisfied"),
  ).toBeVisible();
  expect(execute).not.toHaveBeenCalled();
});

it("offers one native lifecycle workspace within shared connections", () => {
  render(
    <AppConnections
      manifest={template()}
      onChange={vi.fn()}
      onFlows={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  expect(
    screen.getAllByRole("heading", { name: "Order & quote workflows" }),
  ).toHaveLength(1);
});
