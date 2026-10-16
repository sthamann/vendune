/** Installed records share full content locales, main-language inheritance and immutable untranslated values. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import AppEntity, { type Entity } from "../../src/admin/apps/AppEntity";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
const entity: Entity = {
  name: "materials",
  label: { "de-DE": "Materialbibliothek", "ja-JP": "材料" },
  fields: [
    {
      name: "name",
      label: { "de-DE": "Material", "ja-JP": "素材" },
      kind: "string",
      required: true,
      translatable: true,
    },
    {
      name: "fee",
      label: { "de-DE": "Zuschlag", "ja-JP": "料金" },
      kind: "integer",
      required: true,
    },
  ],
};
it("reads full regional locales and saves only the edited translation", async () => {
  const request = vi.fn(async (_path: string, body?: unknown) =>
    body
      ? { revision: 2 }
      : {
          elements: [
            {
              id: "walnut",
              revision: 1,
              name: { "ja-JP": "木材", "de-DE": "Walnuss" },
              fee: 2000,
            },
          ],
        },
  );
  render(
    <ContentLanguage
      mainLocale="ja-JP"
      locales={["ja-JP", "de-DE", "fr-FR"]}
      language="de-DE"
    >
      <AppEntity app="furniture" entity={entity} request={request} canWrite />
    </ContentLanguage>,
    { wrapper: LocaleProvider },
  );
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Material" })).toHaveValue(
      "Walnuss",
    ),
  );
  expect(
    screen.getByRole("button", { name: /walnut · Material: Walnuss/ }),
  ).toBeInTheDocument();
  const user = userEvent.setup();
  await user.clear(screen.getByRole("textbox", { name: "Material" }));
  await user.type(
    screen.getByRole("textbox", { name: "Material" }),
    "Neue Walnuss",
  );
  await user.click(screen.getByRole("button", { name: "Review & save" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/apps/furniture/entities/materials",
      {
        id: "walnut",
        revision: 1,
        fields: {
          name: { "ja-JP": "木材", "de-DE": "Neue Walnuss" },
          fee: 2000,
        },
      },
    ),
  );
});
it("uses the non-English main language without fabricating a missing translation and locks read-only fields", async () => {
  const request = vi.fn(async () => ({
    elements: [{ id: "wood", revision: 1, name: { "ja-JP": "木材" }, fee: 0 }],
  }));
  render(
    <ContentLanguage
      mainLocale="ja-JP"
      locales={["ja-JP", "fr-FR"]}
      language="fr-FR"
    >
      <AppEntity
        app="furniture"
        entity={entity}
        request={request}
        canWrite={false}
      />
    </ContentLanguage>,
    { wrapper: LocaleProvider },
  );
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "素材" })).toHaveAttribute(
      "placeholder",
      "木材",
    ),
  );
  expect(screen.getByRole("textbox", { name: "素材" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "素材" })).toBeDisabled();
  expect(screen.getByRole("spinbutton", { name: "料金" })).toBeDisabled();
  expect(request).toHaveBeenCalledTimes(1);
});
