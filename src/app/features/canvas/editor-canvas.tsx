import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { VIDEO_ASPECT_PRESETS } from "../../const";
import { setProjectInfo } from "../../store/editor-slice";
import { getVideoWorkAreaRect } from "../export/video-work-area";
import CanvasHeader from "./canvas-header";
import CanvasSidePanel from "./canvas-side-panel";
import CanvasToolsFab from "./canvas-tools-fab";
import CanvasZoomControl from "./canvas-zoom-control";
import TimelinePanel from "./timeline/timeline-panel";
import { useListForAiComand } from "./hooks/use-list-for-ai-comand";
import useFabricEditor from "./hooks/use-fabric-editor";
import VideoWorkAreaOverlay from "./video-work-area-overlay";

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
          <canvas ref={bindHost} className="h-full w-full" />
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
