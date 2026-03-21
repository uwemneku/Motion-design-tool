import { FabricObject, Path } from "fabric";
import { useEffect } from "react";

import { VideoObject } from "../../shapes/objects";
import { useCanvasAppContext } from "./use-canvas-app-context";
import { useAppSelector } from "../../../store";

function useSeekObjects() {
  const isPaused = useAppSelector((state) => state.editor.isPaused);
  const playHeadTime = useAppSelector((state) => state.editor.playHeadTime);
  const { fabricCanvasRef, instancesRef } = useCanvasAppContext();

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const update = () => {
      instancesRef.current.forEach((instance) => {
        if (instance instanceof VideoObject) {
          instance.syncPlaybackState(isPaused, playHeadTime);
        } else {
          instance.seek(playHeadTime);
        }
        syncMaskProxyForObject(instance.fabricObject);
        const isActive = instance.fabricObject.customId === canvas.getActiveObject()?.customId;
        if (isActive) {
          instance.fabricObject.fire("my:custom:seek", {
            target: instance.fabricObject,
          });
        }
      });
      canvas.requestRenderAll();
    };
    update();
  }, [fabricCanvasRef, instancesRef, isPaused, playHeadTime]);
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
  if (maskProxy instanceof Path && maskSource instanceof Path) {
    maskProxy.set({
      isClosedPath: maskSource.isClosedPath,
      objectCaching: false,
      path: maskSource.path.map((command) => [...command]),
      dirty: true,
    });
    maskProxy.setDimensions();
  }
  maskProxy.set({
    fill: "#000000",
    objectCaching: false,
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
    shadow: null,
  });
  if (object.clipPath !== maskProxy) {
    object.set("clipPath", maskProxy);
  }
  maskProxy.setCoords();
}

export default useSeekObjects;
