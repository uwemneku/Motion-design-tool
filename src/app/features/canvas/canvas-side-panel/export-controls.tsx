/** Export Controls.Tsx canvas side panel export UI logic. */
import * as Tooltip from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type MouseEvent } from "react";
import { useAppSelector } from "../../../store";
import { SliderPanelControl } from "../../../components/slider-panel-control";
import type { ExportVideoFormat } from "../../export/export-media";
import useExportVideo from "../../export/use-export-video";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

export const EXPORT_VIDEO_LABEL = "Export video";
const EXPORT_FORMAT_OPTIONS: ExportVideoFormat[] = ["mp4", "webm"];

/** Export button and quality controls for the right inspector toolbar. */
export function CanvasSidePanelExportControls() {
  const [exportQuality, setExportQuality] = useState(1);
  const [exportFormat, setExportFormat] = useState<ExportVideoFormat>("mp4");
  const activeAspectRatio =
    useAppSelector((state) => state.editor.projectInfo.videoAspectRatio) ?? 1;
  const { fabricCanvasRef } = useCanvasAppContext();
  const [{ exportProgress, isExporting }, exportVideo] = useExportVideo(
    fabricCanvasRef,
    activeAspectRatio,
  );

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={120}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={() => {
              void exportVideo(exportQuality, exportFormat);
            }}
            onMouseDown={preventMouseDownFocus}
            disabled={isExporting}
            aria-label={EXPORT_VIDEO_LABEL}
            title={EXPORT_VIDEO_LABEL}
            className="rounded-[12px] border border-[#4ba4ff]/35 bg-[linear-gradient(180deg,#1591ff,#0a84ff)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(10,132,255,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <motion.span
              layout
              className="flex items-center gap-2"
              transition={{
                duration: 0.18,
                ease: "easeOut",
              }}
            >
              <span>Export</span>
              <AnimatePresence initial={false}>
                {isExporting ? (
                  <ExportProgressIndicator
                    key="progress"
                    progress={exportProgress}
                  />
                ) : null}
              </AnimatePresence>
            </motion.span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={8}
            className="z-50 w-56 rounded-[14px] border border-white/10 bg-[rgba(20,24,33,0.88)] p-3 text-xs text-[#e6e6e6] shadow-[0_18px_40px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
          >
            <div className="mb-3 space-y-1.5">
              <div className="text-[11px] font-medium text-[#c9ccd6]">
                Format
              </div>
              <select
                value={exportFormat}
                onChange={(event) => {
                  setExportFormat(event.target.value as ExportVideoFormat);
                }}
                className="h-8 w-full rounded-[10px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-2.5 text-[11px] font-medium uppercase text-[#e6e6e6] outline-none transition focus:border-white/60 focus:ring-1 focus:ring-white/20"
              >
                {EXPORT_FORMAT_OPTIONS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>
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
            <Tooltip.Arrow className="fill-[rgba(20,24,33,0.88)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/**
 * Prevents focus changes while pressing toolbar action buttons.
 */
function preventMouseDownFocus(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

type ExportProgressIndicatorProps = {
  progress: number;
};

/** Renders a compact circular progress indicator for active exports. */
function ExportProgressIndicator({ progress }: ExportProgressIndicatorProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <motion.span
      layout
      initial={{ opacity: 0, width: 0, scale: 0.85 }}
      animate={{ opacity: 1, width: 20, scale: 1 }}
      exit={{ opacity: 0, width: 0, scale: 0.85 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex h-5 items-center justify-center overflow-hidden text-[#c6c6c6]"
      aria-label="Export in progress"
      role="status"
    >
      <svg viewBox="0 0 24 24" className="-rotate-90 size-5">
        <circle
          cx="12"
          cy="12"
          r={radius}
          className="stroke-white/15"
          fill="none"
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          className="stroke-current transition-all duration-200 ease-out"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    </motion.span>
  );
}
