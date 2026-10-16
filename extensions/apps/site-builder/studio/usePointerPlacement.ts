/** Captured mouse/touch gestures cross the iframe boundary with viewport-aware drop positions and edge scrolling. */
import { useEffect, useRef, type PointerEvent, type MouseEvent } from "react";
import type { Block } from "../model";
type Point = { x: number; y: number };
type Pending = {
  origin: Point;
  point: Point;
  block: Block;
  moving: boolean;
  started: boolean;
  pointer: number;
};
function point(event: PointerEvent<HTMLElement>): Point {
  const frame = event.currentTarget.ownerDocument.defaultView
    ?.frameElement as HTMLIFrameElement | null;
  const bounds = frame?.getBoundingClientRect(),
    scale = frame ? bounds!.width / frame.clientWidth : 1;
  return {
    x: (bounds?.left ?? 0) + event.clientX * scale,
    y: (bounds?.top ?? 0) + event.clientY * scale,
  };
}
function position({ x, y }: Point): number | null {
  const frame = document.querySelector<HTMLIFrameElement>(
    ".designer-storefront iframe",
  );
  if (!frame?.contentDocument) return null;
  const rect = frame.getBoundingClientRect(),
    scale = rect.width / frame.clientWidth;
  const canvas = frame.closest(".designer-canvas")!.getBoundingClientRect();
  if (
    x < rect.left ||
    x > rect.right ||
    y < Math.max(rect.top, canvas.top) ||
    y > Math.min(rect.bottom, canvas.bottom)
  )
    return null;
  const local = (y - rect.top) / scale;
  const sections = [
    ...frame.contentDocument.querySelectorAll<HTMLElement>("[data-block-id]"),
  ];
  if (
    !sections.length &&
    !frame.contentDocument.querySelector("[data-site-page]")
  )
    return null;
  const index = sections.findIndex(
    (el) => local < el.getBoundingClientRect().bottom,
  );
  if (index < 0) return sections.length;
  const bounds = sections[index].getBoundingClientRect();
  return index + (local > bounds.top + bounds.height / 2 ? 1 : 0);
}
export default function usePointerPlacement({
  enabled,
  start,
  hover,
  commit,
  cancel,
  active,
}: {
  enabled: boolean;
  start: (block: Block, moving: boolean) => boolean;
  hover: (at: number | null) => void;
  commit: (at: number) => void;
  cancel: () => void;
  active: () => boolean;
}) {
  const pending = useRef<Pending | undefined>(undefined),
    suppress = useRef(false),
    animation = useRef(0);
  const stop = () => cancelAnimationFrame(animation.current);
  const current = useRef({ enabled, hover, active });
  current.current = { enabled, hover, active };
  useEffect(() => () => stop(), []);
  const tick = () => {
    const value = pending.current;
    if (
      !value?.started ||
      !current.current.enabled ||
      !current.current.active()
    )
      return;
    const canvas = document.querySelector<HTMLElement>(".designer-canvas"),
      p = value.point;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (p.x >= rect.left && p.x <= rect.right) {
        if (p.y >= rect.bottom - 50 && p.y <= rect.bottom + 20)
          canvas.scrollTop += 14;
        else if (p.y <= rect.top + 90 && p.y >= rect.top - 20)
          canvas.scrollTop -= 14;
      }
    }
    current.current.hover(position(p));
    animation.current = requestAnimationFrame(tick);
  };
  return (block: Block | (() => Block), moving = false) => ({
    onPointerDown(event: PointerEvent<HTMLElement>) {
      suppress.current = false;
      if (!enabled || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const origin = point(event);
      pending.current = {
        origin,
        point: origin,
        block: typeof block === "function" ? block() : block,
        moving,
        started: false,
        pointer: event.pointerId,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const value = pending.current;
      if (!value || value.pointer !== event.pointerId || !enabled) return;
      value.point = point(event);
      if (
        !value.started &&
        Math.hypot(
          value.point.x - value.origin.x,
          value.point.y - value.origin.y,
        ) < 6
      )
        return;
      if (!value.started) {
        if (!start(value.block, value.moving)) {
          pending.current = undefined;
          return;
        }
        value.started = true;
        animation.current = requestAnimationFrame(tick);
      }
      event.preventDefault();
      hover(position(value.point));
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const value = pending.current;
      if (!value || value.pointer !== event.pointerId) return;
      const at = position(point(event));
      pending.current = undefined;
      stop();
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      if (!value.started) return;
      suppress.current = true;
      if (enabled && at !== null) commit(at);
      else cancel();
    },
    onPointerCancel() {
      pending.current = undefined;
      stop();
      cancel();
    },
    onLostPointerCapture() {
      if (pending.current?.started) cancel();
      pending.current = undefined;
      stop();
    },
    onClickCapture(event: MouseEvent) {
      if (!suppress.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppress.current = false;
    },
  });
}
