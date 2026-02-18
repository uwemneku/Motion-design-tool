import type { Canvas } from "fabric";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { FAB_EDGE_PADDING, TOOL_BUTTON_CLASS } from "../../const";
import { useCanvasItems } from "./hooks/use-canvas-items";

type CanvasToolsFabProps = {
  fabricCanvas: MutableRefObject<Canvas | null>;
};

type ToolButtonProps = {
  label: string;
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
};

type Position = {
  x: number;
  y: number;
};

export default function CanvasToolsFab({ fabricCanvas }: CanvasToolsFabProps) {
  const {
    addCircle,
    addImageFromFile,
    addSvgFromFile,
    addLine,
    addPolygon,
    addRectangle,
    addText,
  } = useCanvasItems({ fabricCanvas });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const svgInputRef = useRef<HTMLInputElement | null>(null);
  const fabRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasUserMovedRef = useRef(false);
  const [polygonSides, setPolygonSides] = useState(5);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const onMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const onImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    // Import selected bitmap image into the canvas.
    const file = event.target.files?.[0];
    if (!file) return;
    void addImageFromFile(file);
    event.target.value = "";
  };

  const onSvgSelected = (event: ChangeEvent<HTMLInputElement>) => {
    // Import selected SVG as editable vector objects when parsing succeeds.
    const file = event.target.files?.[0];
    if (!file) return;
    void addSvgFromFile(file);
    event.target.value = "";
  };

  useEffect(() => {
    const node = fabRef.current;
    const parent = node?.parentElement;
    if (!node || !parent) return;

    const updatePosition = () => {
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      const fabWidth = node.offsetWidth;
      const fabHeight = node.offsetHeight;
      setPosition((previous) => {
        if (!previous || !hasUserMovedRef.current) {
          return clampWithinCanvas(
            (parentWidth - fabWidth) / 2,
            FAB_EDGE_PADDING,
            parentWidth,
            parentHeight,
            fabWidth,
            fabHeight,
          );
        }

        return clampWithinCanvas(
          previous.x,
          previous.y,
          parentWidth,
          parentHeight,
          fabWidth,
          fabHeight,
        );
      });
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(parent);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (event: globalThis.MouseEvent) => {
      const node = fabRef.current;
      const parent = node?.parentElement;
      if (!node || !parent) return;

      const parentBounds = parent.getBoundingClientRect();
      const nextX = event.clientX - parentBounds.left - dragOffsetRef.current.x;
      const nextY = event.clientY - parentBounds.top - dragOffsetRef.current.y;
      const clamped = clampWithinCanvas(
        nextX,
        nextY,
        parent.clientWidth,
        parent.clientHeight,
        node.offsetWidth,
        node.offsetHeight,
      );
      setPosition(clamped);
      hasUserMovedRef.current = true;
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  const onHandleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const node = fabRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    setIsDragging(true);
  };

  return (
    <Tooltip.Provider>
      <div
        ref={fabRef}
        className="pointer-events-auto absolute z-30"
        style={{
          left: position?.x ?? 0,
          top: position?.y ?? FAB_EDGE_PADDING,
        }}
      >
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--wise-border)] bg-[var(--wise-surface-raised)]/95 p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur">
          <button
            type="button"
            aria-label="Move tools"
            onMouseDown={onHandleMouseDown}
            className="grid h-8 w-5 place-items-center rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] text-[#a3a3a3] hover:bg-[var(--wise-surface-muted)]"
            title="Drag to move tools"
          >
            <svg
              viewBox="0 0 8 16"
              className={`h-4 w-2 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
              fill="currentColor"
            >
              <circle cx="2" cy="3" r="1" />
              <circle cx="6" cy="3" r="1" />
              <circle cx="2" cy="8" r="1" />
              <circle cx="6" cy="8" r="1" />
              <circle cx="2" cy="13" r="1" />
              <circle cx="6" cy="13" r="1" />
            </svg>
          </button>

          <Tooltip.Root delayDuration={120}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                aria-label="Add polygon"
                onClick={() => {
                  addPolygon({ sides: polygonSides });
                }}
                onMouseDown={onMouseDown}
                className={TOOL_BUTTON_CLASS}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3L4 9l3 10h10l3-10-8-6z" />
                </svg>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                sideOffset={8}
                className="z-50 w-48 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-2 text-xs text-[#e6e6e6] shadow-lg"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span>Polygon sides</span>
                  <span className="text-[#8ac8ff]">{polygonSides}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  value={polygonSides}
                  onChange={(event) => {
                    setPolygonSides(Number(event.target.value));
                  }}
                  className="w-full accent-[#0d99ff]"
                />
                <Tooltip.Arrow className="fill-[var(--wise-surface-raised)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          <ToolButton
            label="Add circle"
            onClick={addCircle}
            onMouseDown={onMouseDown}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="8" />
            </svg>
          </ToolButton>

          <ToolButton
            label="Add line"
            onClick={addLine}
            onMouseDown={onMouseDown}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 18L20 6" />
              <circle
                cx="4"
                cy="18"
                r="1.5"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="20"
                cy="6"
                r="1.5"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </ToolButton>

          <ToolButton
            label="Add rectangle"
            onClick={addRectangle}
            onMouseDown={onMouseDown}
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
          </ToolButton>

          <ToolButton
            label="Add SVG"
            onClick={() => {
              svgInputRef.current?.click();
            }}
            onMouseDown={onMouseDown}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h10l6 6v10H4z" />
              <path d="M14 4v6h6" />
              <path d="M8 15l2.5-3 2 2.5 1.5-2 2 2.5" />
            </svg>
          </ToolButton>

          <ToolButton
            label="Add image"
            onClick={() => {
              imageInputRef.current?.click();
            }}
            onMouseDown={onMouseDown}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M5 17l5-5 3 3 3-2 3 4" />
            </svg>
          </ToolButton>

          <ToolButton
            label="Add text"
            onClick={() => {
              addText();
            }}
            onMouseDown={onMouseDown}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 6h14M12 6v12M8 18h8" />
            </svg>
          </ToolButton>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelected}
        className="hidden"
      />
      <input
        ref={svgInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={onSvgSelected}
        className="hidden"
      />
    </Tooltip.Provider>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampWithinCanvas(
  x: number,
  y: number,
  parentWidth: number,
  parentHeight: number,
  fabWidth: number,
  fabHeight: number,
): Position {
  const maxX = Math.max(
    FAB_EDGE_PADDING,
    parentWidth - fabWidth - FAB_EDGE_PADDING,
  );
  const maxY = Math.max(
    FAB_EDGE_PADDING,
    parentHeight - fabHeight - FAB_EDGE_PADDING,
  );
  return {
    x: clamp(x, FAB_EDGE_PADDING, maxX),
    y: clamp(y, FAB_EDGE_PADDING, maxY),
  };
}

function ToolButton({
  label,
  onClick,
  onMouseDown,
  children,
}: ToolButtonProps) {
  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          onMouseDown={onMouseDown}
          aria-label={label}
          className={TOOL_BUTTON_CLASS}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          sideOffset={8}
          className="z-50 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-2 py-1 text-xs text-[#e6e6e6] shadow-lg"
        >
          {label}
          <Tooltip.Arrow className="fill-[var(--wise-surface-raised)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
