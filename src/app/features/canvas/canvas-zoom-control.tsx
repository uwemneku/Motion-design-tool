/** Canvas Zoom Control.Tsx module implementation. */
import { syncObjectControlBorderScale } from "./util/fabric-controls";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { useAppDispatch, useAppSelector } from "../../store";
import { setProjectInfo } from "../../store/editor-slice";
import { INITIAL_CANVAS_ZOOM } from "../../../const";

/** Floating zoom badge that also resets canvas zoom on click. */
export default function CanvasZoomControl() {
  const { fabricCanvasRef } = useCanvasAppContext();
  const canvasZoom = useAppSelector(
    (state) => state.editor.projectInfo.canvasZoom ?? INITIAL_CANVAS_ZOOM,
  );
  const dispatch = useAppDispatch();

  const resetZoom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    syncObjectControlBorderScale(canvas);
    canvas.requestRenderAll();
    dispatch(setProjectInfo({ canvasZoom: 1 }));
  };

  return (
    <button
      type="button"
      onClick={resetZoom}
      className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 rounded-[12px] border border-white/10 bg-[rgba(20,24,33,0.72)] px-3 py-1.5 text-xs font-semibold text-[#edf3ff] shadow-[0_16px_30px_rgba(0,0,0,0.22)] backdrop-blur-2xl hover:bg-[rgba(255,255,255,0.08)]"
      title="Reset zoom to 100%"
      aria-label="Reset canvas zoom"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      {Math.round(canvasZoom * 100)}%
    </button>
  );
}
