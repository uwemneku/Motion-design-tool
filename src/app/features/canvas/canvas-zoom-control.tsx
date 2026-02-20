/** Canvas Zoom Control.Tsx module implementation. */
import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { Canvas } from "fabric";
import { syncObjectControlBorderScale } from "./util/fabric-controls";

type CanvasZoomControlProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
};

/** Floating zoom badge that also resets canvas zoom on click. */
export default function CanvasZoomControl({
  fabricCanvas,
}: CanvasZoomControlProps) {
  const [canvasZoom, setCanvasZoom] = useState(1);

  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const syncZoom = () => {
      const zoom = canvas.getZoom();
      setCanvasZoom((prev) => (Math.abs(prev - zoom) < 0.0001 ? prev : zoom));
    };

    syncZoom();
    // canvas.on("after:render", syncZoom);
    return () => {
      // canvas.off("after:render", syncZoom);
    };
  }, [fabricCanvas]);

  const resetZoom = () => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    syncObjectControlBorderScale(canvas);
    canvas.requestRenderAll();
    canvas.toDataURL({
      multiplier: 1,
    });
  };

  return (
    <button
      type="button"
      onClick={resetZoom}
      className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/95 px-2.5 py-1 text-xs font-semibold text-slate-100 shadow-lg hover:border-sky-400/70 hover:text-sky-200"
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
