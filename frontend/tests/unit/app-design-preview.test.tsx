/** Passive previews retain real selection, language inheritance and immutable app-owned packages. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import AppCanvas from "../../src/admin/developer/AppCanvas";
import AppDesignPreview from "../../src/admin/developer/AppDesignPreview";
import { appRecipe } from "../../src/admin/developer/app-recipes";
import { controlIcons } from "../../src/admin/developer/app-visuals";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import returns from "../../../extensions/apps/returns-workspace/manifest.json";

it("clones the app-owned package without coupling independent merchant drafts", () => {
  const first = appRecipe("returns", "shop_one"),
    second = appRecipe("returns", "shop_two");
  expect(first.entities).toEqual(returns.entities);
  first.entities[0].fields[1].label.en = "Changed";
  first.views![0].blocks = [];
  expect(second.entities).toEqual(returns.entities);
  expect(second.views![0].blocks).toEqual(returns.views[0].blocks);
});

it("shows translated models and form fields, retains click selection and makes no data calls", async () => {
  localStorage.setItem("rac-locale", "de-DE");
  const manifest = appRecipe("returns", "returns_preview"),
    select = vi.fn(),
    request = vi.fn();
  const { container } = render(
    <LocaleProvider>
      <AppCanvas
        manifest={manifest}
        view={manifest.views![0]}
        selected=""
        onSelect={select}
        onChange={vi.fn()}
        mainLocale="en-GB"
        preview={false}
        previewRequest={request}
      />
    </LocaleProvider>,
  );
  expect(container).not.toHaveTextContent("entries");
  expect(container).toHaveTextContent("Retouren-Arbeitsbereich");
  expect(container).toHaveTextContent("Grund / Empfehlung");
  await userEvent.click(container.querySelectorAll("article")[1]);
  expect(select).toHaveBeenCalledWith("editor");
  expect(request).not.toHaveBeenCalled();
  expect(new Set(Object.values(controlIcons)).size).toBe(
    Object.keys(controlIcons).length,
  );
});

it("uses the selected fifth content language and inherits the main language per missing field", () => {
  const manifest = appRecipe("returns", "returns_languages");
  manifest.entities[0].label = { "ja-JP": "返品", "es-ES": "Devoluciones" };
  manifest.entities[0].fields[1].label = { "es-ES": "Título heredado" };
  render(
    <LocaleProvider>
      <ContentLanguage
        locales={["ja-JP", "es-ES"]}
        mainLocale="es-ES"
        language="ja-JP"
      >
        <AppDesignPreview
          block={manifest.views![0].blocks[1]}
          entities={manifest.entities}
          mainLocale="es-ES"
        />
      </ContentLanguage>
    </LocaleProvider>,
  );
  expect(screen.getByText(/返品/)).toBeVisible();
  expect(screen.getByText("Título heredado")).toBeVisible();
});
