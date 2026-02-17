import type { Canvas } from "fabric";
import {
  useRef,
  type ChangeEvent,
  type MouseEvent,
  type MutableRefObject,
} from "react";
import { useCanvasItems } from "./use-canvas-items";

type CanvasHeaderProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
  onExport: () => Promise<void>;
  isExporting: boolean;
  exportProgress: number;
};

const buttonClass =
  "rounded-md border border-slate-300 bg-slate-50 p-2 text-slate-800 hover:border-blue-500 hover:bg-blue-50";

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
    <div className="flex items-center gap-2.5 border-b border-slate-200 p-2.5" data-testId="header">
      <button
        type="button"
        onClick={addPolygon}
        onMouseDown={onToolbarButtonMouseDown}
        aria-label="Add polygon"
        title="Add polygon"
        className={buttonClass}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3L4 9l3 10h10l3-10-8-6z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={addCircle}
        onMouseDown={onToolbarButtonMouseDown}
        aria-label="Add circle"
        title="Add circle"
        className={buttonClass}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => {
          imageInputRef.current?.click();
        }}
        onMouseDown={onToolbarButtonMouseDown}
        aria-label="Add image"
        title="Add image"
        className={buttonClass}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M5 17l5-5 3 3 3-2 3 4" />
        </svg>
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelected}
        className="hidden"
      />

      <button
        type="button"
        onClick={addText}
        onMouseDown={onToolbarButtonMouseDown}
        aria-label="Add text"
        title="Add text"
        className={buttonClass}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 6h14M12 6v12M8 18h8" />
        </svg>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {isExporting ? (
          <span className="text-xs text-slate-600">
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
          className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export MP4
        </button>
      </div>
    </div>
  );
}
