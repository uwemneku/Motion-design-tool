import { useCallback, useState } from "react";
import { FabricImage, StaticCanvas } from "fabric";
import type { FabricObject } from "fabric";
import { exportCanvasAsMp4 } from "../export/export-media";
import { getVideoWorkAreaRect } from "../export/video-work-area";
import type { KeyframesByProperty } from "../shapes/animatable-object/types";
import { AnimatableObject } from "../shapes/animatable-object/object";
import CanvasHeader from "./canvas-header";
import TimelinePanel from "./timeline-panel";
import { useCanvasAppContext } from "./use-canvas-app-context";
import useFabricEditor from "./use-fabric-editor";
import VideoWorkAreaOverlay from "./video-work-area-overlay";

const EXPORT_FPS = 30;
const EXPORT_DURATION_SECONDS = 10;
const EXPORT_PIXEL_DENSITY = 5;

function cloneKeyframesForExport(
  keyframes: KeyframesByProperty,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number,
): KeyframesByProperty {
  const next: KeyframesByProperty = {};

  for (const [property, propertyKeyframes] of Object.entries(
    keyframes,
  ) as Array<
    [keyof KeyframesByProperty, KeyframesByProperty[keyof KeyframesByProperty]]
  >) {
    if (!propertyKeyframes) continue;

    next[property] = propertyKeyframes.map((keyframe) => {
      let value = keyframe.value;

      if (keyframe.property === "left") {
        value = (keyframe.value - offsetX) * scaleX;
      } else if (keyframe.property === "top") {
        value = (keyframe.value - offsetY) * scaleY;
      } else if (keyframe.property === "scaleX") {
        value = keyframe.value * scaleX;
      } else if (keyframe.property === "scaleY") {
        value = keyframe.value * scaleY;
      }

      return {
        ...keyframe,
        value,
      };
    });
  }

  return next;
}

function cloneImageElementToCanvas(sourceObject: FabricImage): HTMLCanvasElement {
  const element = sourceObject.getElement();
  const isImageElement = element instanceof HTMLImageElement;
  const isCanvasElement = element instanceof HTMLCanvasElement;

  const width = isImageElement
    ? element.naturalWidth || element.width
    : isCanvasElement
      ? element.width
      : sourceObject.width ?? 1;
  const height = isImageElement
    ? element.naturalHeight || element.height
    : isCanvasElement
      ? element.height
      : sourceObject.height ?? 1;

  const snapshotCanvas = document.createElement("canvas");
  snapshotCanvas.width = Math.max(1, Math.round(width));
  snapshotCanvas.height = Math.max(1, Math.round(height));
  const context = snapshotCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create 2d context for image export clone.");
  }
  context.drawImage(element as CanvasImageSource, 0, 0);
  return snapshotCanvas;
}

async function cloneFabricObjectWithCustomId(sourceObject: FabricObject) {
  let clonedObject: FabricObject;
  try {
    clonedObject = await sourceObject.clone();
  } catch (error) {
    if (!(sourceObject instanceof FabricImage)) {
      throw error;
    }

    const snapshotCanvas = cloneImageElementToCanvas(sourceObject);
    clonedObject = new FabricImage(snapshotCanvas, sourceObject.toObject());
  }

  const customId = sourceObject.customId;
  if (customId) {
    clonedObject.customId = customId;
    clonedObject.set("customId", customId);
  }
  return clonedObject;
}

export default function EditorCanvas() {
  const { instancesRef } = useCanvasAppContext();
  const { bindHost, fabricCanvas } = useFabricEditor();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportVideo = useCallback(async () => {
    const liveCanvas = fabricCanvas.current;
    if (!liveCanvas) return;

    const liveWidth = liveCanvas.getWidth();
    const liveHeight = liveCanvas.getHeight();
    const videoArea = getVideoWorkAreaRect(liveWidth, liveHeight);
    const exportWidth = Math.max(
      2,
      Math.round(videoArea.width * EXPORT_PIXEL_DENSITY),
    );
    const exportHeight = Math.max(
      2,
      Math.round(videoArea.height * EXPORT_PIXEL_DENSITY),
    );
    const scaleX = exportWidth / videoArea.width;
    const scaleY = exportHeight / videoArea.height;

    const exportElement = document.createElement("canvas");
    exportElement.width = exportWidth;
    exportElement.height = exportHeight;
    const exportCanvas = new StaticCanvas(exportElement, {
      width: exportWidth,
      height: exportHeight,
      backgroundColor: "#f6f7fb",
      renderOnAddRemove: false,
    });

    const exportInstances = new Map<string, AnimatableObject>();
    const sourceObjects = liveCanvas.getObjects();
    for (const sourceObject of sourceObjects) {
      const clonedObject = await cloneFabricObjectWithCustomId(sourceObject);
      const sourceLeft = sourceObject.left ?? 0;
      const sourceTop = sourceObject.top ?? 0;
      const sourceScaleX = sourceObject.scaleX ?? 1;
      const sourceScaleY = sourceObject.scaleY ?? 1;

      clonedObject.set({
        left: (sourceLeft - videoArea.left) * scaleX,
        top: (sourceTop - videoArea.top) * scaleY,
        scaleX: sourceScaleX * scaleX,
        scaleY: sourceScaleY * scaleY,
      });
      clonedObject.setCoords();
      exportCanvas.add(clonedObject);

      if (sourceObject.customId) {
        const sourceInstance = instancesRef.current.get(sourceObject.customId);
        if (sourceInstance) {
          const exportKeyframes = cloneKeyframesForExport(
            sourceInstance.keyframes,
            videoArea.left,
            videoArea.top,
            scaleX,
            scaleY,
          );
          exportInstances.set(
            sourceObject.customId,
            new AnimatableObject(clonedObject, exportKeyframes),
          );
        }
      }
    }
    exportCanvas.renderAll();

    setIsExporting(true);
    setExportProgress(0);

    try {
      const blob = await exportCanvasAsMp4({
        canvas: exportElement,
        width: exportWidth,
        height: exportHeight,
        durationInSeconds: EXPORT_DURATION_SECONDS,
        fps: EXPORT_FPS,
        onFrame: async (timeInSeconds) => {
          exportInstances.forEach((instance) => {
            instance.seek(timeInSeconds);
          });
          exportCanvas.renderAll();
        },
        onProgress: (progress) => {
          setExportProgress(progress);
        },
      });

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      const anchor = document.createElement("a");
      const timestamp = new Date().toISOString().replaceAll(":", "-");
      anchor.href = url;
      anchor.download = `motion-export-${timestamp}.mp4`;
      anchor.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      exportCanvas.dispose();
    }
  }, [fabricCanvas, instancesRef]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden  border border-slate-300 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08),0_8px_24px_rgba(15,23,42,0.06)]">
      <CanvasHeader
        fabricCanvas={fabricCanvas}
        onExport={exportVideo}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      <div
        className=" flex-1 place-items-center p-5"
        style={{
          background:
            "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 16px, #e2e8f0 16px, #e2e8f0 32px)",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
          <canvas ref={bindHost} className="w-full h-full" />
          <VideoWorkAreaOverlay fabricCanvas={fabricCanvas} />
        </div>
      </div>

      <TimelinePanel />
    </section>
  );
}
