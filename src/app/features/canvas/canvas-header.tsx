import type { Canvas } from "fabric";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  useRef,
  type ChangeEvent,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useCanvasItems } from "./use-canvas-items";

type CanvasHeaderProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
  onExport: () => Promise<void>;
  isExporting: boolean;
  exportProgress: number;
};

const buttonClass =
  "rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-100 hover:border-emerald-400 hover:bg-slate-800";

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
  const { addPolygon, addCircle, addImageFromFile, addText } = useCanvasItems({ fabricCanvas });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
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
        <ToolActionButton
          label="Add polygon"
          onClick={addPolygon}
          onMouseDown={onToolbarButtonMouseDown}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3L4 9l3 10h10l3-10-8-6z" />
          </svg>
        </ToolActionButton>

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
          <button
            type="button"
            onClick={() => {
              void onExport();
            }}
            onMouseDown={onToolbarButtonMouseDown}
            disabled={isExporting}
            className="rounded-md border border-emerald-500/60 bg-emerald-500/15 px-2.5 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export MP4
          </button>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
