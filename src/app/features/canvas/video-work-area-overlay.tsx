/** Video Work Area Overlay.Tsx module implementation. */
import { type FabricObject } from "fabric";
import { useEffect, useRef, useState } from "react";
import { VIDEO_ASPECT_PRESETS } from "../../../const";
import {
  getVideoWorkAreaRect,
  type VideoWorkAreaRect,
} from "../export/video-work-area";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { setProjectInfo } from "../../store/editor-slice";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  bringGuidesToFront,
  computeVideoAreaLabelPosition,
  getViewportBounds,
  guides,
  isVideoGuideObject,
  updateGuideObjects,
  type VideoGuideSet,
} from "./util/video-guide";

/** Overlay that marks the export-visible video area and aspect selector. */
export default function VideoWorkAreaOverlay() {
  const { fabricCanvasRef } = useCanvasAppContext();
  const guidesRef = useRef<VideoGuideSet | null>(null);
  const rectRef = useRef<VideoWorkAreaRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [labelPosition, setLabelPosition] = useState({ left: 0, top: -9999 });
  const aspectRation = useAppSelector(
    (state) => state.editor.projectInfo.videoAspectRatio,
  );
  const activeAspectPreset =
    VIDEO_ASPECT_PRESETS.find(
      (preset) => Math.abs(preset.ratio - aspectRation) < 0.0001,
    ) ?? VIDEO_ASPECT_PRESETS[0];
  const dispatch = useAppDispatch();

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // add guides to canvas if missing.
    if (!guidesRef.current) {
      guidesRef.current = guides;
      canvas.add(
        guides.dimTop,
        guides.dimBottom,
        guides.dimLeft,
        guides.dimRight,
        guides.border,
      );
      bringGuidesToFront(canvas, guides);
    }

    const updateGuidesFromCanvas = (requestRender = false) => {
      const activeGuides = guidesRef.current;
      if (!activeGuides) return;

      const rect = getVideoWorkAreaRect(
        canvas.getWidth(),
        canvas.getHeight(),
        activeAspectPreset.ratio,
      );
      const viewport = getViewportBounds(canvas);
      rectRef.current = rect;

      updateGuideObjects(activeGuides, rect, viewport);
      const nextLabelPosition = computeVideoAreaLabelPosition(canvas, rect);
      setLabelPosition((previous) =>
        Math.abs(previous.left - nextLabelPosition.left) > 0.5 ||
        Math.abs(previous.top - nextLabelPosition.top) > 0.5
          ? nextLabelPosition
          : previous,
      );
      bringGuidesToFront(canvas, activeGuides);
      if (requestRender) {
        canvas.requestRenderAll();
      }
    };

    /**
     * Move guide rect to the front after/when new object is added
     */
    const onObjectAdded = (event: { target?: FabricObject }) => {
      if (isVideoGuideObject(event.target)) return;
      const activeGuides = guidesRef.current;
      if (!activeGuides) return;
      bringGuidesToFront(canvas, activeGuides);
    };

    const onBeforeRender = () => {
      updateGuidesFromCanvas(false);
    };
    const onWindowResize = () => {
      updateGuidesFromCanvas(true);
    };

    updateGuidesFromCanvas(true);
    canvas.on("object:added", onObjectAdded);
    canvas.on("before:render", onBeforeRender);
    window.addEventListener("resize", onWindowResize);

    return () => {
      canvas.off("object:added", onObjectAdded);
      canvas.off("before:render", onBeforeRender);
      window.removeEventListener("resize", onWindowResize);
    };
  }, [activeAspectPreset.ratio, fabricCanvasRef]);

  // Update project info in the store when canvas or aspect ratio changes.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
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
    fabricCanvasRef,
  ]);

  // cleanup guides on unmount
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    return () => {
      const guides = guidesRef.current;
      if (!canvas || !guides) return;
      canvas.remove(
        guides.dimTop,
        guides.dimBottom,
        guides.dimLeft,
        guides.dimRight,
        guides.border,
      );
      guidesRef.current = null;
      canvas.requestRenderAll();
    };
  }, [fabricCanvasRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="pointer-events-auto absolute flex items-center gap-1 transition-opacity opacity-45 hover:opacity-100"
        style={{
          left: labelPosition.left,
          top: labelPosition.top,
        }}
      >
        <div
          className={
            "rounded bg-[var(--wise-accent)]/95 px-2 py-0.5 text-[10px] " +
            "font-semibold uppercase tracking-wide text-white"
          }
        >
          Video Area
        </div>
        <select
          value={activeAspectPreset.label}
          onChange={(event) => {
            const selected = VIDEO_ASPECT_PRESETS.find(
              (option) => option.label === event.target.value,
            );
            if (selected) {
              dispatch(
                setProjectInfo({
                  videoAspectRatio: selected.ratio,
                }),
              );
            }
          }}
          className={
            "appearance-none rounded border border-[var(--wise-border)] " +
            "bg-[var(--wise-surface-raised)]/95 px-2 py-0.5 text-[10px] " +
            "font-semibold uppercase tracking-wide text-[#d4d4d4] outline-none " +
            "ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none " +
            "focus-visible:ring-0 hover:bg-[var(--wise-surface-muted)]"
          }
          style={{
            WebkitAppearance: "none",
            MozAppearance: "none",
            backgroundImage: "none",
          }}
          aria-label="Change video aspect ratio"
        >
          {VIDEO_ASPECT_PRESETS.map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
