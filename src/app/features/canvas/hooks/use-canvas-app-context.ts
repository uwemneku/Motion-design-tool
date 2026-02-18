import { createContext, useContext } from "react";
import type { CanvasAppContextValue } from "../canvas-app-context";

export const CanvasAppContext = createContext<CanvasAppContextValue | null>(
  null,
);

export function useCanvasAppContext() {
  const context = useContext(CanvasAppContext);
  if (!context) {
    throw new Error(
      "useCanvasAppContext must be used within CanvasAppProvider",
    );
  }
  return context;
}
