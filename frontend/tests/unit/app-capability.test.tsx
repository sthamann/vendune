/** Merchant goals share the versioned Manifest, content-language inheritance and existing visual/coding round trip. */
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { responseError } from "../../src/shared/i18n/errors-i18n";
import { it, expect } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../src/shared/i18n/ContentLanguagePicker";
import AppCapabilityEditor from "../../src/admin/developer/AppCapabilityEditor";
import { compile, template } from "../../src/admin/developer/app-model";
import type { Manifest } from "../../src/shared/apps/native/types";
it("edits a goal in a fifth language without copying translations or discarding executable examples", () => {
  const example = {
    id: "one_percent",
    label: { en: "One percent" },
    hook: "price" as const,
    snapshot: { subtotal: { minor: 10000, currency: "EUR", scale: 2 } },
    context: {},
    expected: {
      adjustment: { minor: 100, currency: "EUR", scale: 2 },
      accepted: true,
      reasonCode: "snapshot_price",
    },
  };
  let current: Manifest;
  function Harness() {
    const [m, set] = useState<Manifest>({
      ...template(),
      capability: {
        version: 1,
        intent: { en: "Apply a surcharge" },
        assumptions: [],
        examples: [example],
      },
    });
    current = m;
    return (
      <LocaleProvider>
        <ContentLanguage locales={["en-GB", "sv-SE"]} mainLocale="en-GB">
          <ContentLanguagePicker />
          <AppCapabilityEditor manifest={m} onChange={set} />
        </ContentLanguage>
      </LocaleProvider>
    );
  }
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("What should the app do?"), {
    target: { value: "Apply one percent" },
  });
  expect(current!.capability!.intent).toEqual({ en: "Apply one percent" });
  expect(compile(current!).capability!.examples).toEqual([example]);
  expect(screen.getByText("One percent")).toBeTruthy();
  expect(screen.queryByText(/No executable examples/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add an assumption" }));
  fireEvent.change(screen.getByLabelText("Rules and assumptions"), {
    target: { value: "Native checkout owns tax" },
  });
  expect(current!.capability!.assumptions[0]).toEqual({
    "en-GB": "Native checkout owns tax",
  });
  const locale = screen.getByRole("combobox");
  fireEvent.change(locale, { target: { value: "sv-SE" } });
  fireEvent.change(screen.getByLabelText("What should the app do?"), {
    target: { value: "Lägg till en procent" },
  });
  expect(current!.capability!.intent).toEqual({
    en: "Apply one percent",
    "sv-SE": "Lägg till en procent",
  });
  expect(compile(current!).capability!.examples).toEqual([example]);
});

it("uses structured case pointers for actionable errors without parsing server prose", () => {
  const error = responseError("Private original diagnostic", 400, {
    kind: "validation_error",
    pointer: "/capability/examples/1/expected",
  });
  expect(error.message).toContain("Business example 2 failed");
  expect(error.message).not.toContain("Private original diagnostic");
  expect(error).toMatchObject({
    pointer: "/capability/examples/1/expected",
    diagnostic: "Private original diagnostic",
  });
  expect(responseError("Business example 2 failed", 400).message).not.toContain(
    "Business example 2 failed",
  );
});
