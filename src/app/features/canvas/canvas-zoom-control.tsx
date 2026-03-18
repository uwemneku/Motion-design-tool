/** Canvas Zoom Control.Tsx module implementation. */
import { Search } from "lucide-react";
import { type ComponentProps } from "react";
import { syncObjectControlBorderScale } from "./util/fabric-controls";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { useAppDispatch, useAppSelector } from "../../store";
import { setProjectInfo } from "../../store/editor-slice";
import { INITIAL_CANVAS_ZOOM } from "../../../const";

type CanvasZoomControlProps = Omit<ComponentProps<"button">, "type" | "onClick">;

/** Renders the canvas zoom indicator and resets viewport zoom when clicked. */
export default function CanvasZoomControl({ ...buttonProps }: CanvasZoomControlProps) {
  const { fabricCanvasRef } = useCanvasAppContext();
  const canvasZoom = useAppSelector(
    (state) => state.editor.projectInfo.canvasZoom ?? INITIAL_CANVAS_ZOOM,
  );
  const dispatch = useAppDispatch();

  /** Restores the canvas viewport transform to the default zoom and pan. */
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
      className="flex h-7 items-center conte gap-1.5 rounded-[5px] border border-[var(--wise-border)]  bg-[var(--wise-surface)] px-2.5 text-[11px] font-medium text-slate-200 "
      title="Reset zoom to 100%"
      aria-label="Reset canvas zoom"
      {...buttonProps}
    >
      <Search className="size-3" strokeWidth={2} aria-hidden />
      <span className="h-3.5">{Math.round(canvasZoom * 100)}%</span>
    </button>
  );
}
