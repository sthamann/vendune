/** Public native elements follow the selected editor content language without changing the shopper preference. */
import { render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import NativeAppView from "../../src/shared/apps/native/NativeAppView";
import type { NativePayload } from "../../src/shared/apps/native/types";
it("renders a public app element in the selected fifth content language, independently of interface locale", () => {
  const native = {
    view: {
      id: "sample",
      layout: "stack",
      blocks: [
        {
          id: "text",
          kind: "text",
          title: { "en-GB": "English title", "sv-SE": "Svensk rubrik" },
          text: { "en-GB": "English body", "sv-SE": "Svenskt innehåll" },
        },
      ],
    },
    entities: [],
  } as NativePayload;
  localStorage.setItem("rac-locale", "de-DE");
  render(
    <LocaleScope locale="en-GB">
      <ContentLanguage
        locales={["en-GB", "sv-SE"]}
        mainLocale="en-GB"
        language="sv-SE"
      >
        <NativeAppView
          app="sample"
          native={native}
          request={vi.fn()}
          allowedActions={[]}
          public
          locales={["en-GB", "sv-SE"]}
        />
      </ContentLanguage>
    </LocaleScope>,
  );
  expect(screen.getByRole("heading", { name: "Svensk rubrik" })).toBeVisible();
  expect(screen.getByText("Svenskt innehåll")).toBeVisible();
  expect(localStorage.getItem("rac-locale")).toBe("de-DE");
});
