/** Export Controls.Tsx canvas side panel export UI logic. */
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { FileOutput } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { RadixMenuSelect } from "../../../components/radix-menu-select";
import { useAppSelector } from "../../../store";
import { SliderPanelControl } from "../../../components/slider-panel-control";
import type { ExportVideoFormat } from "../../export/export-media";
import useExportVideo from "../../export/use-export-video";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

export const EXPORT_VIDEO_LABEL = "Export video";
const EXPORT_FORMAT_OPTIONS: ExportVideoFormat[] = ["mp4", "webm"];
const EXPORT_FORMAT_MENU_OPTIONS = EXPORT_FORMAT_OPTIONS.map((format) => ({
  label: format === "mp4" ? "MP4" : "WebM",
  value: format,
}));

/** Export button and quality controls for the right inspector toolbar. */
export function CanvasSidePanelExportControls() {
  const [exportQuality, setExportQuality] = useState(1);
  const [exportFormat, setExportFormat] = useState<ExportVideoFormat>("mp4");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeAspectRatio =
    useAppSelector((state) => state.editor.projectInfo.videoAspectRatio) ?? 1;
  const { fabricCanvasRef } = useCanvasAppContext();
  const [{ exportProgress, isExporting }, exportVideo] = useExportVideo(
    fabricCanvasRef,
    activeAspectRatio,
  );

  /** Opens the hoverable export settings panel immediately. */
  const openMenu = () => {
    setIsMenuOpen(true);
  };

  return (
    <Popover.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <div onMouseEnter={openMenu}>
        <Popover.Anchor asChild>
          <button
            type="button"
            onClick={() => {
              void exportVideo(exportQuality, exportFormat);
            }}
            onMouseDown={preventMouseDownFocus}
            disabled={isExporting}
            aria-label={EXPORT_VIDEO_LABEL}
            title={EXPORT_VIDEO_LABEL}
            className="relative flex size-8 items-center justify-center rounded-[4px] bg-[linear-gradient(135deg,rgba(182,134,255,0.22),rgba(141,171,255,0.82))] text-[11px] font-semibold text-white shadow-[0_18px_32px_rgba(141,171,255,0.08)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <motion.p
              layout
              className="flex items-center gap-2"
              transition={{
                duration: 0.18,
                ease: "easeOut",
              }}
            >
              <FileOutput className="size-3.5" strokeWidth={1.9} aria-hidden />
              <AnimatePresence initial={false}>
                {isExporting ? (
                  <p className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-[4px] scale-200">
                    <ExportProgressIndicator key="progress" progress={exportProgress} />
                  </p>
                ) : null}
              </AnimatePresence>
            </motion.p>
          </button>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="end"
            sideOffset={8}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
            onMouseEnter={openMenu}
            className="z-50 w-56 rounded-[6px] border border-[rgba(141,171,255,0.14)] bg-[linear-gradient(180deg,rgba(38,37,40,0.98),rgba(25,25,28,0.98))] p-3 text-xs text-white shadow-[0_28px_44px_rgba(141,171,255,0.06)] backdrop-blur-2xl"
          >
            <div className="mb-3 space-y-1.5">
              <div className="font-[var(--wise-font-ui)] text-[11px] font-medium text-white/78">
                Format
              </div>
              <RadixMenuSelect
                ariaLabel="Select export format"
                contentClassName="z-50 min-w-[160px] rounded-[6px] border border-[rgba(141,171,255,0.14)] bg-[rgba(25,25,28,0.98)] p-1 shadow-[0_28px_44px_rgba(141,171,255,0.06)] backdrop-blur-xl"
                onOpenChange={() => {
                  openMenu();
                }}
                options={EXPORT_FORMAT_MENU_OPTIONS}
                portalled={false}
                triggerClassName="inline-flex h-8 w-full items-center justify-between gap-2 rounded-[4px] border border-[rgba(141,171,255,0.14)] bg-[var(--wise-surface-raised)] px-2.5 font-[var(--wise-font-display)] text-[12px] font-semibold text-[var(--wise-content-primary)] outline-none transition hover:bg-[rgba(255,255,255,0.08)]"
                value={exportFormat}
                onValueChange={(value) => {
                  setExportFormat(value as ExportVideoFormat);
                }}
              />
            </div>
            <SliderPanelControl
              classNames={{
                label: "text-[11px] font-medium text-white/78",
                rangeLabels:
                  "flex items-center justify-between text-[10px] font-medium text-white/58",
                shell:
                  "mb-1 rounded-[4px] border border-[rgba(141,171,255,0.14)] bg-[var(--wise-surface-raised)] px-2 py-2",
                value:
                  "rounded-[4px] border border-[rgba(141,171,255,0.14)] bg-[rgba(255,255,255,0.08)] px-1.5 py-0.5 font-[var(--wise-font-display)] text-[11px] font-semibold text-white",
              }}
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
            <Popover.Arrow className="fill-[rgba(38,37,40,0.98)]" />
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
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
  const visibleArc = Math.max(circumference * clampedProgress, circumference * 0.14);
  const dashArray = `${visibleArc} ${circumference}`;

  return (
    <motion.span
      layout
      initial={{ opacity: 0, width: 0, scale: 0.85 }}
      animate={{ opacity: 1, width: 22, scale: 1 }}
      exit={{ opacity: 0, width: 0, scale: 0.85 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex h-5 items-center justify-center overflow-hidden text-white"
      aria-label="Export in progress"
      role="status"
    >
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1.05, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        className="relative flex size-5 items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="-rotate-90 size-9">
          <circle
            cx="12"
            cy="12"
            r={radius}
            className="stroke-white/18"
            fill="none"
            strokeWidth="1.75"
          />
          <circle
            cx="12"
            cy="12"
            r={radius}
            className="stroke-current transition-all duration-200 ease-out"
            fill="none"
            strokeDasharray={dashArray}
            strokeLinecap="round"
            strokeWidth="1.75"
          />
        </svg>
      </motion.span>
    </motion.span>
  );
}
