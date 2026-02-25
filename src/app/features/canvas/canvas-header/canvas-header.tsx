/** Canvas Header.Tsx module implementation. */
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { SliderPanelControl } from "../../../components/slider-panel-control";
import CanvasHistoryControls from "./canvas-history-controls";
import useExportVideo from "../../export/use-export-video";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import { useAppSelector } from "../../../store";

/**
 * Top toolbar for export and history controls.
 */
export default function CanvasHeader() {
  const [exportQuality, setExportQuality] = useState(1);
  const activeAspectRatio =
    useAppSelector((state) => state.editor.projectInfo.videoAspectRatio) ?? 1;
  const { fabricCanvasRef } = useCanvasAppContext();
  const [{ exportProgress, isExporting }, exportVideo] = useExportVideo(
    fabricCanvasRef,
    activeAspectRatio,
  );

  return (
    <Tooltip.Provider>
      <div
        className="flex items-center border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-2.5 py-2"
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
          <CanvasHistoryControls disabled={isExporting} />
          {isExporting ? (
            <span className="text-xs text-[#c6c6c6]">
              Exporting {Math.round(exportProgress * 100)}%
            </span>
          ) : null}
          <Tooltip.Root delayDuration={120}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => {
                  void exportVideo(exportQuality);
                }}
                onMouseDown={preventMouseDownFocus}
                disabled={isExporting}
                className="rounded-md border border-[var(--wise-accent)]/75 bg-[var(--wise-accent)]/20 px-2.5 py-1.5 text-sm font-medium text-[#dcefff] hover:bg-[var(--wise-accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export MP4
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={8}
                className="z-50 w-56 rounded-lg border border-[#2f3745] bg-[#121923] p-2.5 text-xs text-[#e6e6e6] shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
              >
                <SliderPanelControl
                  label="Export quality"
                  min={0.5}
                  max={5}
                  minLabel="Draft"
                  maxLabel="Ultra"
                  step={0.1}
                  value={exportQuality}
                  valueText={`${exportQuality.toFixed(1)}x`}
                  onChange={setExportQuality}
                />
                <Tooltip.Arrow className="fill-[#121923]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

/** Prevents focus changes while pressing toolbar action buttons. */
function preventMouseDownFocus(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}
