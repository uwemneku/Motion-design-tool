import * as Tooltip from "@radix-ui/react-tooltip";
import { FabricImage, StaticCanvas } from "fabric";
import type { Canvas, FabricObject } from "fabric";
import type {
  ObjectEvents,
  SerializedObjectProps,
  TFabricObjectProps,
} from "fabric";
import {
  useCallback,
  useState,
  type MouseEvent,
  type MutableRefObject,
} from "react";
import { toast } from "sonner";
import {
  EXPORT_DURATION_SECONDS,
  EXPORT_FPS,
  EXPORT_PIXEL_DENSITY,
} from "../../../const";
import { SliderPanelControl } from "../../components/slider-panel-control";
import { exportCanvasAsMp4 } from "../export/export-media";
import { getVideoWorkAreaRect } from "../export/video-work-area";
import { AnimatableObject } from "../shapes/animatable-object/object";
import type { KeyframesByProperty } from "../shapes/animatable-object/types";
import CanvasHistoryControls from "./canvas-history-controls";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";

type CanvasHeaderProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
  activeAspectRatio: number;
};

type ExportMaskTrackingObject = FabricObject & {
  __maskProxyObject?: FabricObject;
  __maskSourceObject?: FabricObject;
};

export default function CanvasHeader({
  fabricCanvas,
  activeAspectRatio,
}: CanvasHeaderProps) {
  const { instancesRef } = useCanvasAppContext();
  const [exportQuality, setExportQuality] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportVideo = useCallback(
    async (quality: number) => {
      const liveCanvas = fabricCanvas.current;
      if (!liveCanvas) return;
      liveCanvas.discardActiveObject();
      liveCanvas.requestRenderAll();

      const exportScale =
        Math.max(0.5, Math.min(5, quality)) * EXPORT_PIXEL_DENSITY;
      let exportCanvas: StaticCanvas | null = null;

      setIsExporting(true);
      setExportProgress(0);

      try {
        const liveWidth = liveCanvas.getWidth();
        const liveHeight = liveCanvas.getHeight();
        const videoArea = getVideoWorkAreaRect(
          liveWidth,
          liveHeight,
          activeAspectRatio,
        );
        const exportWidth = Math.max(
          2,
          Math.round(videoArea.width * exportScale),
        );
        const exportHeight = Math.max(
          2,
          Math.round(videoArea.height * exportScale),
        );
        const scaleX = exportWidth / videoArea.width;
        const scaleY = exportHeight / videoArea.height;

        const exportElement = document.createElement("canvas");
        exportElement.width = exportWidth;
        exportElement.height = exportHeight;
        exportCanvas = new StaticCanvas(exportElement, {
          width: exportWidth,
          height: exportHeight,
          backgroundColor: "transparent",
          renderOnAddRemove: false,
        });

        const exportInstances = new Map<string, AnimatableObject>();
        const exportObjectsById = new Map<string, FabricObject>();
        const sourceObjectsById = new Map<string, FabricObject>();
        const sourceObjects = liveCanvas.getObjects();
        for (const sourceObject of sourceObjects) {
          if (sourceObject.customId) {
            sourceObjectsById.set(sourceObject.customId, sourceObject);
          }

          const clonedObject =
            await cloneFabricObjectWithCustomId(sourceObject);
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
            exportObjectsById.set(sourceObject.customId, clonedObject);
            const sourceInstance = instancesRef.current.get(
              sourceObject.customId,
            );
            if (sourceInstance) {
              const exportKeyframes = cloneKeyframesForExport(
                sourceInstance.keyframes,
                videoArea.left,
                videoArea.top,
                scaleX,
                scaleY,
              );
              const exportColorKeyframes = {
                fill: sourceInstance.colorKeyframes.fill?.map((keyframe) => ({
                  ...keyframe,
                })),
                stroke: sourceInstance.colorKeyframes.stroke?.map(
                  (keyframe) => ({
                    ...keyframe,
                  }),
                ),
              };
              exportInstances.set(
                sourceObject.customId,
                new AnimatableObject(
                  clonedObject,
                  exportKeyframes,
                  exportColorKeyframes,
                ),
              );
            }
          }
        }

        await remapExportClipPaths(
          sourceObjectsById,
          exportObjectsById,
          videoArea.left,
          videoArea.top,
          scaleX,
          scaleY,
        );
        exportCanvas.renderAll();

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
            exportObjectsById.forEach((exportObject) => {
              syncExportMaskProxyForObject(exportObject);
            });
            exportCanvas?.renderAll();
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown export error";
        toast.error(`Export failed: ${message}`);
      } finally {
        setIsExporting(false);
        setExportProgress(0);
        exportCanvas?.dispose();
      }
    },
    [activeAspectRatio, fabricCanvas, instancesRef],
  );

  const onMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <Tooltip.Provider>
      <div
        className="flex items-center border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-2.5 py-2"
        data-testId="header"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-[#a7a7a7]">
          Motion Editor
        </div>

        <div className="ml-auto flex items-center gap-2">
          <CanvasHistoryControls disabled={isExporting} />
          {isExporting ? (
            <span className="text-xs text-[#c6c6c6]">
              Exporting {Math.round(exportProgress * 100)}%
            </span>
          ) : null}
          <Tooltip.Root delayDuration={120}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => {
                  void exportVideo(exportQuality);
                }}
                onMouseDown={onMouseDown}
                disabled={isExporting}
                className="rounded-md border border-[#0d99ff]/70 bg-[#0d99ff]/20 px-2.5 py-1.5 text-sm font-medium text-[#dcefff] hover:bg-[#0d99ff]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export MP4
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={8}
                className="z-50 w-56 rounded-lg border border-[#2f3745] bg-[#121923] p-2.5 text-xs text-[#e6e6e6] shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
              >
                <SliderPanelControl
                  label="Export quality"
                  min={0.5}
                  max={5}
                  minLabel="Draft"
                  maxLabel="Ultra"
                  step={0.1}
                  value={exportQuality}
                  valueText={`${exportQuality.toFixed(1)}x`}
                  onChange={setExportQuality}
                />
                <Tooltip.Arrow className="fill-[#121923]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

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

function cloneImageElementToCanvas(
  sourceObject: FabricImage,
): HTMLCanvasElement {
  const element = sourceObject.getElement();
  const isImageElement = element instanceof HTMLImageElement;
  const isCanvasElement = element instanceof HTMLCanvasElement;

  const width = isImageElement
    ? element.naturalWidth || element.width
    : isCanvasElement
      ? element.width
      : (sourceObject.width ?? 1);
  const height = isImageElement
    ? element.naturalHeight || element.height
    : isCanvasElement
      ? element.height
      : (sourceObject.height ?? 1);

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

async function cloneFabricObjectWithCustomId<
  Props extends TFabricObjectProps = TFabricObjectProps,
  SProps extends SerializedObjectProps = SerializedObjectProps,
  EventSpec extends ObjectEvents = ObjectEvents,
>(sourceObject: FabricObject<Props, SProps, EventSpec>) {
  let clonedObject: FabricObject<Props, SProps, EventSpec>;
  try {
    clonedObject = await sourceObject.clone();
  } catch (error) {
    if (!(sourceObject instanceof FabricImage)) {
      throw error;
    }

    const snapshotCanvas = cloneImageElementToCanvas(sourceObject);
    clonedObject = new FabricImage(
      snapshotCanvas,
      sourceObject.toObject(),
    ) as FabricObject<Props, SProps, EventSpec>;
  }

  const customId = sourceObject.customId;
  if (customId) {
    clonedObject.customId = customId;
    clonedObject.set("customId", customId);
  }
  return clonedObject;
}

async function remapExportClipPaths(
  sourceObjectsById: Map<string, FabricObject>,
  exportObjectsById: Map<string, FabricObject>,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number,
) {
  // Rebind clip paths on export clones so mask behavior matches the live canvas.
  for (const [sourceId, sourceObject] of sourceObjectsById.entries()) {
    const sourceClipPath = sourceObject.clipPath;
    if (!sourceClipPath) continue;

    const clipPathId =
      "customId" in sourceClipPath &&
      typeof sourceClipPath.customId === "string"
        ? sourceClipPath.customId
        : null;
    const exportObject = exportObjectsById.get(sourceId);
    if (!exportObject) continue;

    let exportClipPath: FabricObject | undefined;
    let exportMaskSourceForSync: FabricObject | undefined;
    if (clipPathId) {
      const exportMaskSource = exportObjectsById.get(clipPathId);
      if (exportMaskSource) {
        // Use a dedicated clip-path clone so the visible source object is not reused as mask.
        exportClipPath = await cloneFabricObjectWithCustomId(exportMaskSource);
        exportMaskSourceForSync = exportMaskSource;
        exportClipPath.set({
          left: exportMaskSource.left,
          top: exportMaskSource.top,
          scaleX: exportMaskSource.scaleX,
          scaleY: exportMaskSource.scaleY,
          angle: exportMaskSource.angle,
          skewX: exportMaskSource.skewX,
          skewY: exportMaskSource.skewY,
          flipX: exportMaskSource.flipX,
          flipY: exportMaskSource.flipY,
          originX: exportMaskSource.originX,
          originY: exportMaskSource.originY,
          visible: false,
          evented: false,
        });
        exportClipPath.setCoords();
      }
    }
    if (!exportClipPath) {
      exportClipPath = await cloneFabricObjectWithCustomId(
        sourceClipPath as unknown as FabricObject,
      );
      const sourceLeft = sourceClipPath.left ?? 0;
      const sourceTop = sourceClipPath.top ?? 0;
      const sourceScaleX = sourceClipPath.scaleX ?? 1;
      const sourceScaleY = sourceClipPath.scaleY ?? 1;
      exportClipPath.set({
        left: (sourceLeft - offsetX) * scaleX,
        top: (sourceTop - offsetY) * scaleY,
        scaleX: sourceScaleX * scaleX,
        scaleY: sourceScaleY * scaleY,
        visible: false,
        evented: false,
      });
      exportClipPath.setCoords();
    }

    exportClipPath.set(
      "absolutePositioned",
      Boolean(sourceClipPath.absolutePositioned),
    );
    exportObject.set("clipPath", exportClipPath);
    setExportMaskTracking(
      exportObject,
      exportClipPath,
      exportMaskSourceForSync,
    );
    exportObject.setCoords();
  }
}

function setExportMaskTracking(
  targetObject: FabricObject,
  maskProxyObject: FabricObject,
  maskSourceObject?: FabricObject,
) {
  // Store mask references so export frame rendering can sync animated mask transforms.
  const trackingObject = targetObject as ExportMaskTrackingObject;
  trackingObject.__maskProxyObject = maskProxyObject;
  trackingObject.__maskSourceObject = maskSourceObject;
}

function syncExportMaskProxyForObject(targetObject: FabricObject) {
  // Keep exported clip-path proxies aligned with their animated source objects.
  const trackingObject = targetObject as ExportMaskTrackingObject;
  const maskProxy = trackingObject.__maskProxyObject;
  const maskSource = trackingObject.__maskSourceObject;
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
  if (targetObject.clipPath !== maskProxy) {
    targetObject.set("clipPath", maskProxy);
  }
  maskProxy.setCoords();
}
