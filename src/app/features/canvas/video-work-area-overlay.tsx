/** Video Work Area Overlay.Tsx module implementation. */
import { useEffect, useRef, useState } from "react";
import { RadixMenuSelect } from "../../components/radix-menu-select";
import { VIDEO_ASPECT_PRESETS } from "../../../const";
import { getVideoWorkAreaRect, type VideoWorkAreaRect } from "../export/video-work-area";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { setProjectInfo } from "../../store/editor-slice";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  computeVideoAreaLabelPosition,
  getVideoAreaScreenRect,
} from "./util/video-guide";

/** Overlay that marks the export-visible video area and aspect selector. */
export default function VideoWorkAreaOverlay() {
  const { fabricCanvasRef } = useCanvasAppContext();
  const rectRef = useRef<VideoWorkAreaRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [screenRect, setScreenRect] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [labelPosition, setLabelPosition] = useState({ left: 0, top: -9999 });
  const [isVideoOnlyOverlay, setIsVideoOnlyOverlay] = useState(false);
  const aspectRation = useAppSelector((state) => state.editor.projectInfo.videoAspectRatio);
  const activeAspectPreset =
    VIDEO_ASPECT_PRESETS.find((preset) => Math.abs(preset.ratio - aspectRation) < 0.0001) ??
    VIDEO_ASPECT_PRESETS[0];
  const dispatch = useAppDispatch();
  const aspectMenuOptions = VIDEO_ASPECT_PRESETS.map((option) => ({
    label: option.label,
    value: option.label,
  }));

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    /** Syncs the screen-space cutout and label position from the live canvas viewport. */
    const updateOverlayFromCanvas = () => {
      const rect = getVideoWorkAreaRect(
        canvas.getWidth(),
        canvas.getHeight(),
        activeAspectPreset.ratio,
      );
      rectRef.current = rect;
      const nextScreenRect = getVideoAreaScreenRect(canvas, rect);
      setScreenRect((previous) =>
        Math.abs(previous.left - nextScreenRect.left) > 0.5 ||
        Math.abs(previous.top - nextScreenRect.top) > 0.5 ||
        Math.abs(previous.width - nextScreenRect.width) > 0.5 ||
        Math.abs(previous.height - nextScreenRect.height) > 0.5
          ? nextScreenRect
          : previous,
      );
      const nextLabelPosition = computeVideoAreaLabelPosition(canvas, rect);
      setLabelPosition((previous) =>
        Math.abs(previous.left - nextLabelPosition.left) > 0.5 ||
        Math.abs(previous.top - nextLabelPosition.top) > 0.5
          ? nextLabelPosition
          : previous,
      );
    };

    const onBeforeRender = () => {
      updateOverlayFromCanvas();
    };
    const onWindowResize = () => {
      updateOverlayFromCanvas();
    };

    updateOverlayFromCanvas();
    canvas.on("before:render", onBeforeRender);
    window.addEventListener("resize", onWindowResize);

    return () => {
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
      const videoRect = getVideoWorkAreaRect(canvasWidth, canvasHeight, activeAspectPreset.ratio);

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
  }, [activeAspectPreset.label, activeAspectPreset.ratio, dispatch, fabricCanvasRef]);
  /** Captures the current video work area as a still preview image. */
  const openVideoAreaPreview = () => {};

  const overlayOpacity = isVideoOnlyOverlay
    ? "rgba(0, 0, 0, 0.92)"
    : "rgba(0, 0, 0, 0.42)";

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        aria-hidden
        className="absolute border-2 border-[#2563eb] bg-transparent"
        style={{
          boxShadow: `0 0 0 9999px ${overlayOpacity}`,
          height: screenRect.height,
          left: screenRect.left,
          top: screenRect.top,
          width: screenRect.width,
        }}
      />
      <div
        className="pointer-events-auto absolute flex items-center gap-1 transition-opacity opacity-45 hover:opacity-100"
        style={{
          left: labelPosition.left,
          top: labelPosition.top,
        }}
      >
        <div
          className={
            "rounded px-2 py-0.5 text-[10px] " + "font-semibold uppercase tracking-wide text-white"
          }
          style={{ backgroundColor: "#2563eb" }}
        >
          Video Area
        </div>
        <button
          type="button"
          onClick={openVideoAreaPreview}
          className={
            "grid h-5 w-5 place-items-center rounded border " +
            "bg-[var(--wise-surface-raised)]/95 text-[#d4d4d4] transition-colors " +
            "hover:bg-[var(--wise-surface-muted)]"
          }
          style={{ borderColor: "#2563eb" }}
          aria-label="Preview video area screenshot"
          title="Preview video area"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M1.75 4.75a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2z" />
            <path d="m6.25 6 3.5 2-3.5 2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsVideoOnlyOverlay((previous) => !previous);
          }}
          className={
            "grid h-5 w-5 place-items-center rounded border " +
            "bg-[var(--wise-surface-raised)]/95 text-[#d4d4d4] transition-colors " +
            "hover:bg-[var(--wise-surface-muted)]"
          }
          style={{ borderColor: "#2563eb" }}
          aria-label={isVideoOnlyOverlay ? "Show standard video overlay" : "Show only video area"}
          title={isVideoOnlyOverlay ? "Show standard overlay" : "Show only video area"}
        >
          {isVideoOnlyOverlay ? (
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2.5 3.5h11v9h-11z" />
              <path d="M5 5.5h6v5H5z" />
              <path d="m3 3 10 10" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2.5 3.5h11v9h-11z" />
              <path d="M5 5.5h6v5H5z" />
            </svg>
          )}
        </button>
        <RadixMenuSelect
          ariaLabel="Change video aspect ratio"
          contentClassName="z-50 min-w-[120px] rounded-[8px] border border-[#2563eb] bg-[rgba(20,24,33,0.96)] p-1 shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          options={aspectMenuOptions}
          side="bottom"
          triggerClassName={
            "inline-flex items-center gap-2 rounded-[5px] border " +
            "border-[#2563eb] bg-[var(--wise-surface-raised)]/95 px-2 py-0.5 text-[10px] " +
            "font-semibold uppercase tracking-wide text-[#d4d4d4] outline-none " +
            "hover:bg-[var(--wise-surface-muted)]"
          }
          value={activeAspectPreset.label}
          onValueChange={(value) => {
            const selected = VIDEO_ASPECT_PRESETS.find(
              (option) => option.label === value,
            );
            if (selected) {
              dispatch(
                setProjectInfo({
                  videoAspectRatio: selected.ratio,
                }),
              );
            }
          }}
        />
      </div>
    </div>
  );
}
