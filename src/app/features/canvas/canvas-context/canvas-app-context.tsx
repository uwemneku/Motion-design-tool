/** Canvas App Context.Tsx module implementation. */
import type { Canvas } from "fabric";
import {
  useMemo,
  useRef,
  type MutableRefObject,
  type PropsWithChildren,
} from "react";
import type { AnimatableObject } from "../../shapes/animatable-object/object";
import { CanvasAppContext } from "../hooks/use-canvas-app-context";

type CanvasInstanceStore = Map<string, AnimatableObject>;

export type CanvasAppContextValue = {
  fabricCanvasRef: MutableRefObject<Canvas | null>;
  instancesRef: MutableRefObject<CanvasInstanceStore>;
  setFabricCanvasInstance: (canvas: Canvas | null) => void;
  registerInstance: (id: string, instance: AnimatableObject) => void;
  unregisterInstance: (id: string) => void;
  clearInstances: () => void;
  getInstanceById: (id: string) => AnimatableObject | undefined;
};

/** Provides a shared registry of live canvas object instances. */
export function CanvasAppProvider({ children }: PropsWithChildren) {
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const instancesRef = useRef<CanvasInstanceStore>(new Map());

  const value = useMemo<CanvasAppContextValue>(
    () => ({
      fabricCanvasRef,
      instancesRef,
      setFabricCanvasInstance: (canvas: Canvas | null) => {
        fabricCanvasRef.current = canvas;
      },
      registerInstance: (id: string, instance: AnimatableObject) => {
        instancesRef.current.set(id, instance);
      },
      unregisterInstance: (id: string) => {
        instancesRef.current.delete(id);
      },
      clearInstances: () => {
        instancesRef.current.clear();
      },
      getInstanceById: (id: string) => instancesRef.current.get(id),
    }),
    [],
  );

  return (
    <CanvasAppContext.Provider value={value}>
      {children}
    </CanvasAppContext.Provider>
  );
}
