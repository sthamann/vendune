/** A hidden, disabled, nested or wrong-record custom control must never remove the usable fallback submit. */
import { expect, it } from "vitest";
import { hasSubmitControl } from "../../src/shared/apps/native/form-submit";
import type { Block } from "../../src/shared/apps/native/types";
const form: Block = {
  id: "editor",
  kind: "form",
  title: {},
  writeAction: "save_entries",
};
const button: Block = {
  id: "save",
  kind: "button",
  title: {},
  handlers: {
    click: [
      { op: "validate", target: "editor" },
      {
        op: "call",
        action: "save_entries",
        input: { kind: "record", block: "editor" },
      },
    ],
  },
};
it("recognizes only the explicit validated form submit", () => {
  expect(hasSubmitControl(form, [form, button])).toBe(true);
  for (const control of [
    { ...button, visible: false },
    { ...button, enabled: false },
    {
      ...button,
      handlers: {
        click: [
          { op: "validate" as const, target: "other" },
          button.handlers!.click![1],
        ],
      },
    },
  ])
    expect(hasSubmitControl(form, [form, control])).toBe(false);
  expect(
    hasSubmitControl(form, [
      form,
      button,
      { id: "tabs", kind: "tabs", title: {}, childBlocks: ["save"] },
    ]),
  ).toBe(false);
});
