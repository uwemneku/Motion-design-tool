import { useCallback, useEffect, useState } from "react";
import { FabricImage, StaticCanvas } from "fabric";
import type { Canvas, FabricObject } from "fabric";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { dispatchableSelector, type AppDispatch } from "../../store";
import {
  removeItemRecord,
  setSelectedId,
  upsertItemRecord,
} from "../../store/editor-slice";
import { exportCanvasAsMp4 } from "../export/export-media";
import { getVideoWorkAreaRect } from "../export/video-work-area";
import type { KeyframesByProperty } from "../shapes/animatable-object/types";
import { AnimatableObject } from "../shapes/animatable-object/object";
import {
  AI_EDITOR_COMMAND_EVENT,
  emitAIImageStatus,
  type AIEditorCommand,
} from "../ai/editor-ai-events";
import { generateOpenAIImageDataUrl } from "../ai/openai-chat";
import CanvasHeader from "./canvas-header";
import TimelinePanel from "./timeline-panel";
import CanvasSidePanel from "./canvas-side-panel";
import CanvasZoomControl from "./canvas-zoom-control";
import { useCanvasAppContext } from "./use-canvas-app-context";
import useFabricEditor from "./use-fabric-editor";
import VideoWorkAreaOverlay from "./video-work-area-overlay";
import { useCanvasItems } from "./use-canvas-items";

const EXPORT_FPS = 30;
const EXPORT_DURATION_SECONDS = 10;
const EXPORT_PIXEL_DENSITY = 1;
const KEYFRAME_EPSILON = 0.001;
const VIDEO_ASPECT_PRESETS = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
];

function createKeyframeMarkerId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `kf-${crypto.randomUUID()}`;
  }
  return `kf-${Math.random().toString(36).slice(2, 10)}`;
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
  const [aspectPresetIndex, setAspectPresetIndex] = useState(0);

  const activeAspectPreset = VIDEO_ASPECT_PRESETS[aspectPresetIndex];

  const exportVideo = useCallback(
    async (quality: number) => {
      const liveCanvas = fabricCanvas.current;
      if (!liveCanvas) return;

      const exportScale = Math.max(0.5, Math.min(5, quality)) * EXPORT_PIXEL_DENSITY;
      let exportCanvas: StaticCanvas | null = null;

      setIsExporting(true);
      setExportProgress(0);

      try {
        const liveWidth = liveCanvas.getWidth();
        const liveHeight = liveCanvas.getHeight();
        const videoArea = getVideoWorkAreaRect(
          liveWidth,
          liveHeight,
          activeAspectPreset.ratio,
        );
        const exportWidth = Math.max(2, Math.round(videoArea.width * exportScale));
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
          const exportColorKeyframes = {
            fill: sourceInstance.colorKeyframes.fill?.map((keyframe) => ({
              ...keyframe,
            })),
            stroke: sourceInstance.colorKeyframes.stroke?.map((keyframe) => ({
              ...keyframe,
            })),
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
    [activeAspectPreset.ratio, fabricCanvas, instancesRef],
  );
  useListForAiComand(fabricCanvas);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border border-slate-700 bg-slate-900 shadow-[0_10px_35px_rgba(2,6,23,0.5)]">
      <CanvasHeader
        fabricCanvas={fabricCanvas}
        onExport={exportVideo}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      <div
        data-canvas_container
        className="flex flex-1 min-h-0 place-items-center"
        style={{
          background:
            "repeating-linear-gradient(45deg, #0f172a, #0f172a 16px, #111827 16px, #111827 32px)",
        }}
      >
        <div className="relative h-full min-w-0 flex-1 overflow-hidden border border-slate-700 bg-slate-950">
          <canvas ref={bindHost} className="w-full h-full" />
          <CanvasZoomControl fabricCanvas={fabricCanvas} />
          <VideoWorkAreaOverlay
            fabricCanvas={fabricCanvas}
            aspectRatio={activeAspectPreset.ratio}
            aspectLabel={activeAspectPreset.label}
            aspectOptions={VIDEO_ASPECT_PRESETS}
            onSelectAspectRatio={(nextRatio) => {
              const nextIndex = VIDEO_ASPECT_PRESETS.findIndex(
                (preset) => Math.abs(preset.ratio - nextRatio) < 0.0001,
              );
              if (nextIndex >= 0) {
                setAspectPresetIndex(nextIndex);
              }
            }}
          />
        </div>
        <CanvasSidePanel />
      </div>

      <TimelinePanel />
    </section>
  );
}

const useListForAiComand = (fabricCanvas: React.RefObject<Canvas | null>) => {
  const { instancesRef, unregisterInstance } = useCanvasAppContext();

  const dispatch = useDispatch<AppDispatch>();
  const {
    addCircle,
    addPolygon,
    addLine,
    addRectangle,
    addText,
    addImageFromURL,
  } = useCanvasItems({
    fabricCanvas,
  });

  useEffect(() => {
    const onAICommand = (event: Event) => {
      const customEvent = event as CustomEvent<AIEditorCommand>;
      const command = customEvent.detail;
      const canvas = fabricCanvas.current;
      if (!canvas) return;

      const resolveTargetId = (target?: { id?: string; name?: string }) => {
        if (target?.id) return target.id;

        const itemsRecord = dispatch(
          dispatchableSelector((state) => state.editor.itemsRecord),
        );
        if (target?.name) {
          const needle = target.name.trim().toLowerCase();
          const exact = Object.entries(itemsRecord).find(
            ([, item]) => item.name.trim().toLowerCase() === needle,
          );
          if (exact) return exact[0];

          const partial = Object.entries(itemsRecord).find(([, item]) =>
            item.name.trim().toLowerCase().includes(needle),
          );
          if (partial) return partial[0];
        }

        return dispatch(
          dispatchableSelector((state) => state.editor.selectedId),
        );
      };

      const upsertTimelineMarkers = (id: string, times: number[]) => {
        if (times.length === 0) return;
        const existing = dispatch(
          dispatchableSelector((state) => state.editor.itemsRecord[id]),
        );
        if (!existing) return;

        const next = [...existing.keyframe];
        times.forEach((time) => {
          const hasMarker = next.some(
            (marker) => Math.abs(marker.timestamp - time) <= KEYFRAME_EPSILON,
          );
          if (!hasMarker) {
            next.push({
              id: createKeyframeMarkerId(),
              timestamp: time,
            });
          }
        });

        dispatch(
          upsertItemRecord({
            id,
            value: {
              ...existing,
              keyframe: next.sort((a, b) => a.timestamp - b.timestamp),
            },
          }),
        );
      };

      if (command.type === "add_circle") {
        addCircle({ color: command.color, keyframes: command.keyframes });
        return;
      }

      if (command.type === "add_polygon") {
        addPolygon({ color: command.color, keyframes: command.keyframes });
        return;
      }

      if (command.type === "add_line") {
        addLine({ color: command.color, keyframes: command.keyframes });
        return;
      }

      if (command.type === "add_rectangle") {
        addRectangle({ color: command.color, keyframes: command.keyframes });
        return;
      }

      if (command.type === "add_text") {
        addText(command.text ?? "AI title", {
          color: command.color,
          keyframes: command.keyframes,
        });
        return;
      }

      if (command.type === "add_image") {
        if (command.url) {
          void (async () => {
            emitAIImageStatus({ status: "start", prompt: command.url });
            try {
              await addImageFromURL(command.url!, {
                keyframes: command.keyframes,
              });
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Unknown error";
              toast.error(`Failed to load image: ${message}`);
            } finally {
              emitAIImageStatus({ status: "end", prompt: command.url });
            }
          })();
          return;
        }

        if (command.prompt) {
          void (async () => {
            emitAIImageStatus({ status: "start", prompt: command.prompt });
            try {
              const generatedUrl = await generateOpenAIImageDataUrl(
                command.prompt!,
              );
              await addImageFromURL(generatedUrl, {
                keyframes: command.keyframes,
              });
            } catch (error) {
              console.error("AI image generation failed", error);
              const message =
                error instanceof Error ? error.message : "Unknown error";
              toast.error(`Image generation failed: ${message}`);
            } finally {
              emitAIImageStatus({ status: "end", prompt: command.prompt });
            }
          })();
        }
        return;
      }

      if (command.type === "delete_item") {
        const targetId = resolveTargetId(command.target);
        if (!targetId) return;

        const targetObject = canvas
          .getObjects()
          .find((object) => object.customId === targetId);
        if (targetObject) {
          canvas.remove(targetObject);
          canvas.requestRenderAll();
        }

        unregisterInstance(targetId);
        dispatch(removeItemRecord(targetId));
        if (
          dispatch(dispatchableSelector((state) => state.editor.selectedId)) ===
          targetId
        ) {
          dispatch(setSelectedId(null));
        }
        return;
      }

      if (command.type === "update_item") {
        const targetId = resolveTargetId(command.target);
        if (!targetId) return;

        const targetObject = canvas
          .getObjects()
          .find((object) => object.customId === targetId);
        if (!targetObject) return;

        const instance = instancesRef.current.get(targetId);
        const currentPlayhead = dispatch(
          dispatchableSelector((state) => state.editor.playheadTime),
        );
        const markerTimes: number[] = [];

        if (command.props) {
          if (typeof command.props.left === "number")
            targetObject.set("left", command.props.left);
          if (typeof command.props.top === "number")
            targetObject.set("top", command.props.top);
          if (typeof command.props.scaleX === "number")
            targetObject.set("scaleX", command.props.scaleX);
          if (typeof command.props.scaleY === "number")
            targetObject.set("scaleY", command.props.scaleY);
          if (typeof command.props.opacity === "number")
            targetObject.set("opacity", command.props.opacity);
          if (typeof command.props.angle === "number")
            targetObject.set("angle", command.props.angle);
          if (typeof command.props.text === "string")
            targetObject.set("text", command.props.text);
          targetObject.setCoords();
          canvas.requestRenderAll();

          if (instance) {
            const nextSnapshot = {
              ...instance.getSnapshot(),
              ...(typeof command.props.left === "number"
                ? { left: command.props.left }
                : {}),
              ...(typeof command.props.top === "number"
                ? { top: command.props.top }
                : {}),
              ...(typeof command.props.scaleX === "number"
                ? { scaleX: command.props.scaleX }
                : {}),
              ...(typeof command.props.scaleY === "number"
                ? { scaleY: command.props.scaleY }
                : {}),
              ...(typeof command.props.opacity === "number"
                ? { opacity: command.props.opacity }
                : {}),
              ...(typeof command.props.angle === "number"
                ? { angle: command.props.angle }
                : {}),
            };
            instance.addSnapshotKeyframe(currentPlayhead, nextSnapshot);
            markerTimes.push(currentPlayhead);
          }
        }

        if (instance && Array.isArray(command.keyframes)) {
          let rollingSnapshot = instance.getSnapshot();
          [...command.keyframes]
            .sort((a, b) => a.time - b.time)
            .forEach((keyframe) => {
              const nextSnapshot = {
                ...rollingSnapshot,
                ...(typeof keyframe.left === "number"
                  ? { left: keyframe.left }
                  : {}),
                ...(typeof keyframe.top === "number"
                  ? { top: keyframe.top }
                  : {}),
                ...(typeof keyframe.scaleX === "number"
                  ? { scaleX: keyframe.scaleX }
                  : {}),
                ...(typeof keyframe.scaleY === "number"
                  ? { scaleY: keyframe.scaleY }
                  : {}),
                ...(typeof keyframe.opacity === "number"
                  ? { opacity: keyframe.opacity }
                  : {}),
                ...(typeof keyframe.angle === "number"
                  ? { angle: keyframe.angle }
                  : {}),
              };
              instance.addSnapshotKeyframe(keyframe.time, nextSnapshot);
              rollingSnapshot = nextSnapshot;
              markerTimes.push(keyframe.time);
            });
        }

        upsertTimelineMarkers(targetId, markerTimes);
        dispatch(setSelectedId(targetId));
      }
    };

    window.addEventListener(
      AI_EDITOR_COMMAND_EVENT,
      onAICommand as EventListener,
    );
    return () => {
      window.removeEventListener(
        AI_EDITOR_COMMAND_EVENT,
        onAICommand as EventListener,
      );
    };
  }, [
    addCircle,
    addPolygon,
    addLine,
    addRectangle,
    addText,
    addImageFromURL,
    dispatch,
    fabricCanvas,
    instancesRef,
    unregisterInstance,
  ]);
};
