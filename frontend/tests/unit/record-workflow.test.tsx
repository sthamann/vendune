/** Actual native form uses initial status, scoped case selection and permitted transitions; server denial remains separate. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { appRecipe } from "../../src/admin/developer/app-recipes";
import NativeRecordForm from "../../src/shared/apps/native/NativeRecordForm";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import {
  recordFields,
  workflowField,
} from "../../src/shared/apps/native/record-workflow";
it("supports multiple cases on one owned order and prevents a terminal status from moving backwards", async () => {
  const entity = appRecipe("returns", "returns").entities[0];
  const save = vi.fn().mockResolvedValue(undefined);
  render(
    <NativeRecordForm
      entity={entity}
      records={[
        {
          id: "first",
          revision: 1,
          order_id: "order",
          title: { en: "Damaged parcel" },
          status: "review",
        },
        {
          id: "second",
          revision: 2,
          order_id: "order",
          title: { en: "Wrong size" },
          status: "closed",
        },
      ]}
      boundFields={{ order_id: "order" }}
      save={save}
      saved={() => {}}
    />,
    { wrapper: LocaleProvider },
  );
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Record" }),
    "second",
  );
  expect(screen.getByRole("option", { name: "Wrong size" })).toBeVisible();
  expect(
    screen.queryByRole("option", { name: "Under review" }),
  ).not.toBeInTheDocument();
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Record" }),
    "",
  );
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("new");
  expect(
    screen.queryByRole("option", { name: "Closed" }),
  ).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});
it("keeps bound identities and projects choices without changing the manifest", () => {
  const entity = appRecipe("returns", "returns").entities[0];
  expect(recordFields(entity, undefined, { order_id: "owned" })).toEqual({
    status: "new",
    order_id: "owned",
  });
  const status = entity.fields.find((f) => f.name === "status")!;
  expect(
    workflowField(entity, status, {
      id: "case",
      revision: 1,
      status: "review",
    }).choices?.map((c) => c.value),
  ).toEqual(["review", "received", "closed"]);
  expect(status.choices).toHaveLength(4);
});
