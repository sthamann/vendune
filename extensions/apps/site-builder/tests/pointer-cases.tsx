/** Mouse/touch placement converts scaled iframe coordinates and excludes clipped/outside targets. */
import {
  render,
  renderHook,
  expect,
  it,
  vi,
} from "../../../../frontend/tests/unit/package-test-support";
import usePointerPlacement from "../studio/usePointerPlacement";
import { newBlock } from "../model";
import { useDesignText } from "../studio/design-i18n";
function Fixture() {
  const t = useDesignText();
  return (
    <section className="designer-canvas">
      <div className="designer-storefront">
        <iframe title={t("preview")} />
      </div>
    </section>
  );
}
it("places a captured iframe drag using its scaled viewport and cancels an outside drop", () => {
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const ui = render(<Fixture />);
  const frame = ui.container.querySelector("iframe")!,
    canvas = ui.container.querySelector("section")!;
  const rect = (x: number, y: number, width: number, height: number) => ({
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON: () => ({}),
  });
  frame.getBoundingClientRect = () => rect(100, 200, 640, 700) as DOMRect;
  canvas.getBoundingClientRect = () => rect(80, 180, 700, 740) as DOMRect;
  Object.defineProperty(frame, "clientWidth", { value: 1280 });
  const doc = frame.contentDocument!;
  doc.body.innerHTML =
    '<article data-site-page="one"><section data-block-id="first"></section><section data-block-id="second"></section><button>Move</button></article>';
  const sections = doc.querySelectorAll("section");
  sections[0].getBoundingClientRect = () => rect(0, 100, 1280, 200) as DOMRect;
  sections[1].getBoundingClientRect = () => rect(0, 312, 1280, 400) as DOMRect;
  const button = doc.querySelector("button")!;
  Object.assign(button, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => true,
    releasePointerCapture: vi.fn(),
  });
  const start = vi.fn(() => true),
    hover = vi.fn(),
    commit = vi.fn(),
    cancel = vi.fn();
  const hook = renderHook(() =>
    usePointerPlacement({
      enabled: true,
      start,
      hover,
      commit,
      cancel,
      active: () => true,
    }),
  );
  const gesture = hook.result.current(newBlock("text", "en-GB", "Drag"), true);
  const event = (y: number, x = 100) =>
    ({
      pointerId: 1,
      button: 0,
      clientX: x,
      clientY: y,
      currentTarget: button,
      preventDefault: vi.fn(),
    }) as any;
  try {
    gesture.onPointerDown(event(120));
    gesture.onPointerMove(event(640));
    expect(start).toHaveBeenCalledOnce();
    expect(hover).toHaveBeenLastCalledWith(2);
    gesture.onPointerUp(event(640));
    expect(commit).toHaveBeenCalledWith(2);
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    gesture.onClickCapture(click);
    expect(click.stopPropagation).toHaveBeenCalledOnce();
    gesture.onPointerDown(event(120));
    gesture.onPointerMove(event(640));
    gesture.onPointerUp(event(640, 3000));
    expect(commit).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  } finally {
    hook.unmount();
    ui.unmount();
    vi.unstubAllGlobals();
  }
});
