/** Canvas Header.Tsx module implementation. */
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Canvas } from "fabric";
import { useState, type MouseEvent, type MutableRefObject } from "react";
import { SliderPanelControl } from "../../../components/slider-panel-control";
import CanvasHistoryControls from "./canvas-history-controls";
import useExportVideo from "../../export/use-export-video";

type CanvasHeaderProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
  activeAspectRatio: number;
};

/**
 * Top toolbar for export and history controls.
 */
export default function CanvasHeader({
  fabricCanvas,
  activeAspectRatio,
}: CanvasHeaderProps) {
  const [exportQuality, setExportQuality] = useState(1);
  const [{ exportProgress, isExporting }, exportVideo] = useExportVideo(
    fabricCanvas,
    activeAspectRatio,
  );

  return (
    <Tooltip.Provider>
      <div
        className="flex items-center border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-2.5 py-2"
        data-testId="header"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-[#a7a7a7]">
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
