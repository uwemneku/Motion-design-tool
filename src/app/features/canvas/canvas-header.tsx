import type { Canvas } from "fabric";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useCanvasItems } from "./use-canvas-items";

type CanvasHeaderProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
  onExport: (quality: number) => Promise<void>;
  isExporting: boolean;
  exportProgress: number;
};

const buttonClass =
  "rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-100 hover:border-sky-400 hover:bg-slate-800";

type ToolActionButtonProps = {
  label: string;
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
};

function ToolActionButton({
  label,
  onClick,
  onMouseDown,
  children,
}: ToolActionButtonProps) {
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          onMouseDown={onMouseDown}
          aria-label={label}
          className={buttonClass}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={8}
          className="z-50 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-lg"
        >
          {label}
          <Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export default function CanvasHeader({
  fabricCanvas,
  onExport,
  isExporting,
  exportProgress,
}: CanvasHeaderProps) {
  const {
    addPolygon,
    addCircle,
    addLine,
    addRectangle,
    addImageFromFile,
    addText,
  } = useCanvasItems({ fabricCanvas });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [polygonSides, setPolygonSides] = useState(5);
  const [exportQuality, setExportQuality] = useState(1);
  const onToolbarButtonMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const onImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    void addImageFromFile(file);
    event.target.value = "";
  };

  return (
    <Tooltip.Provider>
      <div
        className="flex items-center gap-2.5 border-b border-slate-700 bg-slate-900 p-2.5"
        data-testId="header"
      >
        <Tooltip.Root delayDuration={120}>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={() => {
                addPolygon({ sides: polygonSides });
              }}
              onMouseDown={onToolbarButtonMouseDown}
              aria-label="Add polygon"
              className={buttonClass}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3L4 9l3 10h10l3-10-8-6z" />
              </svg>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              sideOffset={8}
              className="z-50 w-48 rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 shadow-lg"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span>Polygon sides</span>
                <span className="text-sky-300">{polygonSides}</span>
              </div>
              <input
                type="range"
                min={3}
                max={12}
                value={polygonSides}
                onChange={(event) => {
                  setPolygonSides(Number(event.target.value));
                }}
                className="w-full accent-sky-400"
              />
              <Tooltip.Arrow className="fill-slate-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <ToolActionButton
          label="Add circle"
          onClick={addCircle}
          onMouseDown={onToolbarButtonMouseDown}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8" />
          </svg>
        </ToolActionButton>

        <ToolActionButton
          label="Add line"
          onClick={addLine}
          onMouseDown={onToolbarButtonMouseDown}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 18L20 6" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="20" cy="6" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ToolActionButton>

        <ToolActionButton
          label="Add rectangle"
          onClick={addRectangle}
          onMouseDown={onToolbarButtonMouseDown}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="7" width="16" height="10" rx="1.5" />
          </svg>
        </ToolActionButton>

        <ToolActionButton
          label="Add image"
          onClick={() => {
            imageInputRef.current?.click();
          }}
          onMouseDown={onToolbarButtonMouseDown}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M5 17l5-5 3 3 3-2 3 4" />
          </svg>
        </ToolActionButton>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelected}
        className="hidden"
      />

        <ToolActionButton
          label="Add text"
          onClick={() => {
            addText();
          }}
          onMouseDown={onToolbarButtonMouseDown}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 6h14M12 6v12M8 18h8" />
          </svg>
        </ToolActionButton>

        <div className="ml-auto flex items-center gap-2">
          {isExporting ? (
            <span className="text-xs text-slate-300">
              Exporting {Math.round(exportProgress * 100)}%
            </span>
          ) : null}
          <Tooltip.Root delayDuration={120}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => {
                  void onExport(exportQuality);
                }}
                onMouseDown={onToolbarButtonMouseDown}
                disabled={isExporting}
                className="rounded-md border border-sky-500/60 bg-sky-500/15 px-2.5 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export MP4
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={8}
                className="z-50 w-48 rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 shadow-lg"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span>Quality</span>
                  <span className="text-sky-300">{exportQuality.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={exportQuality}
                  onChange={(event) => {
                    setExportQuality(Number(event.target.value));
                  }}
                  className="w-full accent-sky-400"
                />
                <Tooltip.Arrow className="fill-slate-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
