/** Editor-only navigation connects UI behavior to the existing Flow Builder, without another executor. */
import { createContext } from "react";
export const AppFlowNavigation = createContext<(() => void) | null>(null);
