import type { FabricObject } from "fabric";
import { AI_STEP_COMPLETE_EVENT } from "../../ai/editor-ai-events";
import { useEffect } from "react";

import { useCanvasAppContext } from "./use-canvas-app-context";
import { useAppSelector } from "../../../store";

function useSeekObjects() {
  const playHeadTime = useAppSelector((state) => state.editor.playHeadTime);
  const { fabricCanvasRef, instancesRef } = useCanvasAppContext();
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const update = () => {
      instancesRef.current.forEach((instance) => {
        instance.seek(playHeadTime);
        syncMaskProxyForObject(instance.fabricObject);
      });
      canvas.requestRenderAll();
    };
    update();

    window.addEventListener(AI_STEP_COMPLETE_EVENT, update as EventListener);
    return () => {
      window.removeEventListener(
        AI_STEP_COMPLETE_EVENT,
        update as EventListener,
      );
    };
  }, [fabricCanvasRef, instancesRef, playHeadTime]);
}

export function SeekObjects() {
  useSeekObjects();
  return null;
}

type MaskTrackingFabricObject = FabricObject & {
  __maskProxyObject?: FabricObject;
  __maskSourceObject?: FabricObject;
};

function syncMaskProxyForObject(object: FabricObject) {
  // Keep a target's clip-path proxy in sync with an animated mask source object.
  const maskTarget = object as MaskTrackingFabricObject;
  const maskProxy = maskTarget.__maskProxyObject;
  const maskSource = maskTarget.__maskSourceObject;
  if (!maskProxy || !maskSource) return;

  maskProxy.set({
    left: maskSource.left,
    top: maskSource.top,
    scaleX: maskSource.scaleX,
    scaleY: maskSource.scaleY,
    angle: maskSource.angle,
    skewX: maskSource.skewX,
    skewY: maskSource.skewY,
    flipX: maskSource.flipX,
    flipY: maskSource.flipY,
    originX: maskSource.originX,
    originY: maskSource.originY,
  });
  if (object.clipPath !== maskProxy) {
    object.set("clipPath", maskProxy);
  }
  maskProxy.setCoords();
}

export default useSeekObjects;
