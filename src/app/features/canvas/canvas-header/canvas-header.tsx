/** Canvas Header.Tsx module implementation. */
import { toast } from "sonner";
import CanvasHistoryControls from "./canvas-history-controls";
import { CanvasSidePanelExportControls } from "../canvas-side-panel/export-controls";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

/**
 * Top toolbar for export and history controls.
 */
export default function CanvasHeader() {
  const { fabricCanvasRef } = useCanvasAppContext();

  return (
    <div
      className=" z-30 flex items-center border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-2.5 py-2"
      data-testId="header"
    >
      <div
        className="text-xs font-semibold uppercase tracking-wide text-[#a7a7a7]"
        onClick={() => {
          const canvas = fabricCanvasRef.current;
          canvas?.toCanvasElement(2).toBlob((blob) => {
            if (!blob) {
              toast.error("Failed to capture canvas screenshot.");
              return;
            }
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
          });
        }}
      >
        Motion Editor
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CanvasHistoryControls />
        <CanvasSidePanelExportControls />
      </div>
    </div>
  );
}
