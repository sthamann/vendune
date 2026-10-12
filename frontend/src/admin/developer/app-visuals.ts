/** Presentation-only symbols for native controls; behavior still belongs to the shared runtime. */
import type { Block } from "../../shared/apps/native/types";
import type { IconName } from "../../shared/ui/Icon";
export const controlIcons: Record<Block["kind"], IconName> = {
  text: "text",
  table: "table",
  cards: "layers",
  form: "form",
  button: "button",
  textbox: "input",
  combobox: "select",
  checkbox: "checkbox",
  datepicker: "calendar",
  image: "image",
  frame: "frame",
  tabs: "tabs",
  kpi: "gauge",
  chart: "chart",
};
