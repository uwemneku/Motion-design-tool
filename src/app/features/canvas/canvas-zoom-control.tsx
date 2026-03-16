/** Canvas Zoom Control.Tsx module implementation. */
import { Search } from "lucide-react";
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
      className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 rounded-[12px] border border-white/8 bg-[rgba(46,46,49,0.9)] px-3 py-1.5 text-xs font-semibold text-[#f3f4f6] shadow-[0_16px_30px_rgba(0,0,0,0.22)] backdrop-blur-2xl hover:bg-[rgba(255,255,255,0.08)]"
      title="Reset zoom to 100%"
      aria-label="Reset canvas zoom"
    >
      <Search className="size-3.5" strokeWidth={2} aria-hidden />
      {Math.round(canvasZoom * 100)}%
    </button>
  );
}
