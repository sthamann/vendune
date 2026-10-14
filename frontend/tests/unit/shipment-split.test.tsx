/** Package editor exercises quantity admission, translated controls and parent command completion. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ShipmentSplit from "../../src/admin/orders/ShipmentSplit";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
const delivery = {
  positions: [
    { id: "sku-a", quantity: 3 },
    { id: "sku-b", quantity: 2 },
  ],
};
it("selects a strict subset without duplicating items and closes after confirmation", async () => {
  const onSplit = vi.fn().mockResolvedValue(true);
  const user = userEvent.setup();
  render(
    <ShipmentSplit
      delivery={delivery}
      labels={{ "sku-a": "Cotton shirt", "sku-b": "Jacket" }}
      enabled
      busy={false}
      onSplit={onSplit}
    />,
    { wrapper: LocaleProvider },
  );
  await user.click(
    screen.getByRole("button", { name: "Split into another package" }),
  );
  await user.click(screen.getByRole("button", { name: "Create package" }));
  expect(screen.getByRole("alert")).toHaveTextContent("positive subset");
  expect(onSplit).not.toHaveBeenCalled();
  const inputs = screen.getAllByRole("spinbutton");
  await user.clear(inputs[0]);
  await user.type(inputs[0], "2");
  await user.click(screen.getByRole("button", { name: "Create package" }));
  expect(onSplit).toHaveBeenCalledWith([{ id: "sku-a", quantity: 2 }]);
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
});
it("keeps failed commands editable and hides admission for denied/read-only packages", async () => {
  const onSplit = vi.fn().mockResolvedValue(false);
  const user = userEvent.setup();
  const view = render(
    <ShipmentSplit
      delivery={delivery}
      labels={{}}
      enabled
      busy={false}
      onSplit={onSplit}
    />,
    { wrapper: LocaleProvider },
  );
  await user.click(
    screen.getByRole("button", { name: "Split into another package" }),
  );
  const input = screen.getAllByRole("spinbutton")[0];
  await user.clear(input);
  await user.type(input, "1");
  await user.click(screen.getByRole("button", { name: "Create package" }));
  expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(1);
  view.rerender(
    <ShipmentSplit
      delivery={delivery}
      labels={{}}
      enabled={false}
      busy={false}
      onSplit={onSplit}
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
