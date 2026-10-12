/** Hide the fallback submit only for a visible top-level button that explicitly validates and saves this form. */
import type { Block } from "./types";
export function hasSubmitControl(form: Block, blocks: Block[]) {
  const nested = new Set(blocks.flatMap((b) => b.childBlocks ?? []));
  return blocks.some((b) => {
    if (
      b.kind !== "button" ||
      b.visible === false ||
      b.enabled === false ||
      nested.has(b.id)
    )
      return false;
    const steps = b.handlers?.click ?? [];
    const validation = steps.findIndex(
      (s) => s.op === "validate" && s.target === form.id,
    );
    return (
      validation >= 0 &&
      steps.some(
        (s, i) =>
          i > validation &&
          s.op === "call" &&
          s.action === form.writeAction &&
          s.input.kind === "record" &&
          s.input.block === form.id,
      )
    );
  });
}
