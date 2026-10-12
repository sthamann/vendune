/** Size the register pane from its actual header position, including translated toolbars and tablet wraps. */
import { useLayoutEffect, useRef } from "react";
export function useRegisterViewport() {
  const pane = useRef<HTMLDivElement>(null);
  const measure = () => {
    const node = pane.current;
    if (!node) return;
    const top = Math.max(0, node.getBoundingClientRect().top);
    const value = `${top + 16}px`;
    if (node.style.getPropertyValue("--pos-register-offset") !== value)
      node.style.setProperty("--pos-register-offset", value);
  };
  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    if (pane.current?.parentElement)
      observer.observe(pane.current.parentElement);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  });
  return pane;
}
