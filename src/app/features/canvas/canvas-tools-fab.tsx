/** Canvas Tools Fab.Tsx module implementation. */
import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  AddCircleButton,
  AddLineButton,
  AddPathButton,
  AddRectangleButton,
  AddTextButton,
} from "../../components/canvas-tools/add-basic-buttons";
import { AddAssetButton } from "../../components/canvas-tools/add-file-buttons";
import { AddPolygonButton } from "../../components/canvas-tools/add-polygon-button";
import { useAppDispatch, useAppSelector } from "../../store";
import { setActiveCanvasTool } from "../../store/editor-slice";
import { useCanvasItems } from "./hooks/use-canvas-items";
import { FAB_EDGE_PADDING } from "../../../const";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";

type Position = {
  x: number;
  y: number;
};

/** Draggable floating tool dock for adding canvas items. */
export default function CanvasToolsFab() {
  const dispatch = useAppDispatch();
  const { fabricCanvasRef } = useCanvasAppContext();
  const activeCanvasTool = useAppSelector((state) => state.editor.activeCanvasTool);
  const {
    addCircle,
    addImageFromFile,
    addSvgFromFile,
    addVideoFromFile,
    addLine,
    addPolygon,
    addRectangle,
    addText,
  } = useCanvasItems({ fabricCanvas: fabricCanvasRef });
  const fabRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasUserMovedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const onMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
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
            parentHeight - fabHeight - FAB_EDGE_PADDING,
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
        <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-[rgba(46,46,49,0.9)] p-1 shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <button
            type="button"
            aria-label="Move tools"
            onMouseDown={onHandleMouseDown}
            className="grid h-8 w-5 place-items-center rounded-sm border border-white/8 bg-[rgba(255,255,255,0.045)] text-[#d1d5db] hover:bg-[rgba(255,255,255,0.08)]"
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

          <AddPolygonButton
            onAddPolygon={(sides) => {
              addPolygon({ sides });
            }}
            onMouseDown={onMouseDown}
          />
          <AddCircleButton onAddCircle={addCircle} onMouseDown={onMouseDown} />
          <AddLineButton onAddLine={addLine} onMouseDown={onMouseDown} />
          <AddPathButton
            isPathToolActive={activeCanvasTool === "path"}
            onAddPath={() => {
              dispatch(setActiveCanvasTool(activeCanvasTool === "path" ? "select" : "path"));
            }}
            onMouseDown={onMouseDown}
          />
          <AddRectangleButton onAddRectangle={addRectangle} onMouseDown={onMouseDown} />
          <AddAssetButton
            onAddImageFile={addImageFromFile}
            onAddSvgFile={addSvgFromFile}
            onAddVideoFile={addVideoFromFile}
            onMouseDown={onMouseDown}
          />
          <AddTextButton onAddText={addText} onMouseDown={onMouseDown} />
        </div>
      </div>
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
  const maxX = Math.max(FAB_EDGE_PADDING, parentWidth - fabWidth - FAB_EDGE_PADDING);
  const maxY = Math.max(FAB_EDGE_PADDING, parentHeight - fabHeight - FAB_EDGE_PADDING);
  return {
    x: clamp(x, FAB_EDGE_PADDING, maxX),
    y: clamp(y, FAB_EDGE_PADDING, maxY),
  };
}
