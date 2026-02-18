import { useEffect, useState } from "react";
import type { Canvas } from "fabric";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { dispatchableSelector, type AppDispatch } from "../../store";
import {
  removeItemRecord,
  setProjectInfo,
  setSelectedId,
  upsertItemRecord,
} from "../../store/editor-slice";
import { getVideoWorkAreaRect } from "../export/video-work-area";
import {
  emitAIActionStatus,
  AI_EDITOR_COMMAND_EVENT,
  emitAIImageStatus,
  type AIEditorCommand,
} from "../ai/editor-ai-events";
import { generateOpenAIImageDataUrl } from "../ai/openai-chat";
import CanvasHeader from "./canvas-header";
import CanvasSidePanel from "./canvas-side-panel";
import CanvasToolsFab from "./canvas-tools-fab";
import CanvasZoomControl from "./canvas-zoom-control";
import TimelinePanel from "./timeline/timeline-panel";
import { useCanvasAppContext } from "./use-canvas-app-context";
import { useCanvasItems } from "./use-canvas-items";
import useFabricEditor from "./use-fabric-editor";
import VideoWorkAreaOverlay from "./video-work-area-overlay";

const KEYFRAME_EPSILON = 0.001;
const VIDEO_ASPECT_PRESETS = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
];

export default function EditorCanvas() {
  const { bindHost, fabricCanvas } = useFabricEditor();
  const [aspectPresetIndex, setAspectPresetIndex] = useState(0);
  const dispatch = useDispatch();

  const activeAspectPreset = VIDEO_ASPECT_PRESETS[aspectPresetIndex];
  useListForAiComand(fabricCanvas);

  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const updateProjectInfoFromCanvas = () => {
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const videoRect = getVideoWorkAreaRect(
        canvasWidth,
        canvasHeight,
        activeAspectPreset.ratio,
      );

      dispatch(
        setProjectInfo({
          canvasWidth,
          canvasHeight,
          videoWidth: Math.round(videoRect.width),
          videoHeight: Math.round(videoRect.height),
          videoLeft: Math.round(videoRect.left),
          videoTop: Math.round(videoRect.top),
          videoRight: Math.round(videoRect.left + videoRect.width),
          videoBottom: Math.round(videoRect.top + videoRect.height),
          videoAspectRatio: activeAspectPreset.ratio,
          videoAspectLabel: activeAspectPreset.label,
        }),
      );
    };

    updateProjectInfoFromCanvas();
    window.addEventListener("resize", updateProjectInfoFromCanvas);

    return () => {
      window.removeEventListener("resize", updateProjectInfoFromCanvas);
    };
  }, [
    activeAspectPreset.label,
    activeAspectPreset.ratio,
    dispatch,
    fabricCanvas,
  ]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] shadow-[0_10px_35px_rgba(2,6,23,0.5)]">
      <CanvasHeader
        fabricCanvas={fabricCanvas}
        activeAspectRatio={activeAspectPreset.ratio}
      />

      <div
        data-canvas_container
        className="flex min-h-0 flex-1 flex-col xl:flex-row"
        style={{
          background:
            "repeating-linear-gradient(45deg, #262626, #262626 16px, #2c2c2c 16px, #2c2c2c 32px)",
        }}
      >
        <div className="relative min-h-[240px] min-w-0 flex-1 overflow-hidden border border-[var(--wise-border)] bg-[var(--wise-surface)] xl:h-full">
          <CanvasToolsFab fabricCanvas={fabricCanvas} />
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
    addImagePlaceholder,
    addImageFromURL,
    removeItemById,
    replaceItemWithImageFromURL,
  } = useCanvasItems({
    fabricCanvas,
  });

  useEffect(() => {
    const onAICommand = (event: Event) => {
      const customEvent = event as CustomEvent<AIEditorCommand>;
      const command = customEvent.detail;
      const runCommand = async () => {
        const canvas = fabricCanvas.current;
        if (!canvas) return;
        emitAIActionStatus({ status: "start", actionType: command.type });

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

        try {

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
              emitAIImageStatus({ status: "start", prompt: command.url });
              try {
                await addImageFromURL(command.url, {
                  keyframes: command.keyframes,
                });
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : "Unknown error";
                toast.error(`Failed to load image: ${message}`);
              } finally {
                emitAIImageStatus({ status: "end", prompt: command.url });
              }
              return;
            }

            if (command.prompt) {
              emitAIImageStatus({ status: "start", prompt: command.prompt });
              const placeholderId = addImagePlaceholder();
              try {
                const generatedUrl = await generateOpenAIImageDataUrl(
                  command.prompt,
                );
                if (placeholderId) {
                  await replaceItemWithImageFromURL(placeholderId, generatedUrl, {
                    keyframes: command.keyframes,
                  });
                } else {
                  await addImageFromURL(generatedUrl, {
                    keyframes: command.keyframes,
                  });
                }
              } catch (error) {
                if (placeholderId) {
                  removeItemById(placeholderId);
                }
                console.error("AI image generation failed", error);
                const message =
                  error instanceof Error ? error.message : "Unknown error";
                toast.error(`Image generation failed: ${message}`);
              } finally {
                emitAIImageStatus({ status: "end", prompt: command.prompt });
              }
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
            let addedKeyframe = false;
            if (typeof command.props.left === "number") {
              instance.addKeyframe({
                property: "left",
                value: command.props.left,
                time: currentPlayhead,
                easing: "linear",
              });
              addedKeyframe = true;
            }
            if (typeof command.props.top === "number") {
              instance.addKeyframe({
                property: "top",
                value: command.props.top,
                time: currentPlayhead,
                easing: "linear",
              });
              addedKeyframe = true;
            }
            if (typeof command.props.scaleX === "number") {
              instance.addKeyframe({
                property: "scaleX",
                value: command.props.scaleX,
                time: currentPlayhead,
                easing: "linear",
              });
              addedKeyframe = true;
            }
            if (typeof command.props.scaleY === "number") {
              instance.addKeyframe({
                property: "scaleY",
                value: command.props.scaleY,
                time: currentPlayhead,
                easing: "linear",
              });
              addedKeyframe = true;
            }
            if (typeof command.props.opacity === "number") {
              instance.addKeyframe({
                property: "opacity",
                value: command.props.opacity,
                time: currentPlayhead,
                easing: "linear",
              });
              addedKeyframe = true;
            }
            if (typeof command.props.angle === "number") {
              instance.addKeyframe({
                property: "angle",
                value: command.props.angle,
                time: currentPlayhead,
                easing: "linear",
              });
              addedKeyframe = true;
            }
            if (addedKeyframe) {
              markerTimes.push(currentPlayhead);
            }
          }
        }

        if (instance && Array.isArray(command.keyframes)) {
          [...command.keyframes]
            .sort((a, b) => a.time - b.time)
            .forEach((keyframe) => {
              if (typeof keyframe.left === "number") {
                instance.addKeyframe({
                  property: "left",
                  value: keyframe.left,
                  time: keyframe.time,
                  easing: keyframe.easing ?? "linear",
                });
              }
              if (typeof keyframe.top === "number") {
                instance.addKeyframe({
                  property: "top",
                  value: keyframe.top,
                  time: keyframe.time,
                  easing: keyframe.easing ?? "linear",
                });
              }
              if (typeof keyframe.scaleX === "number") {
                instance.addKeyframe({
                  property: "scaleX",
                  value: keyframe.scaleX,
                  time: keyframe.time,
                  easing: keyframe.easing ?? "linear",
                });
              }
              if (typeof keyframe.scaleY === "number") {
                instance.addKeyframe({
                  property: "scaleY",
                  value: keyframe.scaleY,
                  time: keyframe.time,
                  easing: keyframe.easing ?? "linear",
                });
              }
              if (typeof keyframe.opacity === "number") {
                instance.addKeyframe({
                  property: "opacity",
                  value: keyframe.opacity,
                  time: keyframe.time,
                  easing: keyframe.easing ?? "linear",
                });
              }
              if (typeof keyframe.angle === "number") {
                instance.addKeyframe({
                  property: "angle",
                  value: keyframe.angle,
                  time: keyframe.time,
                  easing: keyframe.easing ?? "linear",
                });
              }

              if (
                typeof keyframe.left === "number" ||
                typeof keyframe.top === "number" ||
                typeof keyframe.scaleX === "number" ||
                typeof keyframe.scaleY === "number" ||
                typeof keyframe.opacity === "number" ||
                typeof keyframe.angle === "number"
              ) {
                markerTimes.push(keyframe.time);
              }
            });
        }

            upsertTimelineMarkers(targetId, markerTimes);
            dispatch(setSelectedId(targetId));
          }
        } finally {
          emitAIActionStatus({ status: "end", actionType: command.type });
        }
      };

      void runCommand();
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
    addImagePlaceholder,
    addCircle,
    addImageFromURL,
    addLine,
    addPolygon,
    addRectangle,
    addText,
    dispatch,
    fabricCanvas,
    instancesRef,
    removeItemById,
    replaceItemWithImageFromURL,
    unregisterInstance,
  ]);
};

function createKeyframeMarkerId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `kf-${crypto.randomUUID()}`;
  }
  return `kf-${Math.random().toString(36).slice(2, 10)}`;
}
