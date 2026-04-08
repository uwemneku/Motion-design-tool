/** DOM transform handles overlay for selected canvas objects. */
import { FabricObject, Point } from "fabric";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FIGMA_BLUE } from "../../../const";
import { useAppSelector } from "../../store";
import { useCanvasItems } from "./hooks/use-canvas-items";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";
import { usesDomTransformHandles } from "./util/fabric-controls";

type HandleKind =
  | "corner-tl"
  | "corner-tr"
  | "corner-br"
  | "corner-bl"
  | "edge-top"
  | "edge-right"
  | "edge-bottom"
  | "edge-left"
  | "rotate";

type ScreenPoint = {
  x: number;
  y: number;
};

type OverlayGeometry = {
  bottomCenter: ScreenPoint;
  bottomLeft: ScreenPoint;
  bottomRight: ScreenPoint;
  center: ScreenPoint;
  leftCenter: ScreenPoint;
  rightCenter: ScreenPoint;
  rotateHandle: ScreenPoint;
  rotateStemEnd: ScreenPoint;
  topCenter: ScreenPoint;
  topLeft: ScreenPoint;
  topRight: ScreenPoint;
};

type DragState = {
  aspectRatio: number;
  anchorCanvasPoint: Point;
  baseHeight: number;
  baseWidth: number;
  handleKind: HandleKind;
  intrinsicHeight: number;
  intrinsicWidth: number;
  objectId: string | null;
  objectStartAngle: number;
  objectStartCenter: Point;
  oppositeCanvasPoint?: Point;
  selectedIds: string[];
  startPointerAngle?: number;
};

/** Renders DOM-based resize and rotation handles above the Fabric canvas stage. */
export default function DomTransformHandles() {
  const { fabricCanvasRef, getObjectById } = useCanvasAppContext();
  const { captureNumericSnapshotKeyframes } = useCanvasItems({
    fabricCanvas: fabricCanvasRef,
  });
  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const [geometry, setGeometry] = useState<OverlayGeometry | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const selectedObject = useMemo(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

    if (selectedIds.length > 1) {
      return canvas.getActiveObject() ?? null;
    }

    if (!selectedId) return null;
    return getObjectById(selectedId)?.fabricObject ?? null;
  }, [fabricCanvasRef, getObjectById, selectedId, selectedIds]);

  const showOverlay =
    selectedIds.length > 0 &&
    Boolean(selectedObject) &&
    usesDomTransformHandles(selectedObject as FabricObject);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    /** Keeps the DOM overlay aligned with the selected object's current screen-space box. */
    const syncGeometry = () => {
      if (!selectedObject || !usesDomTransformHandles(selectedObject)) {
        setGeometry(null);
        return;
      }

      setGeometry(readOverlayGeometry(canvas, selectedObject));
    };

    syncGeometry();
    canvas.on("before:render", syncGeometry);
    window.addEventListener("resize", syncGeometry);

    return () => {
      canvas.off("before:render", syncGeometry);
      window.removeEventListener("resize", syncGeometry);
    };
  }, [fabricCanvasRef, selectedObject]);

  useEffect(() => {
    /** Updates object geometry from the active DOM handle drag. */
    const handleWindowPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const canvas = fabricCanvasRef.current;
      const object = dragState
        ? dragState.objectId
          ? getObjectById(dragState.objectId)?.fabricObject ?? null
          : canvas?.getActiveObject() ?? null
        : null;
      if (!dragState || !canvas || !object) return;

      const pointer = screenPointToCanvasPoint(
        canvas,
        event.clientX,
        event.clientY,
      );

      if (dragState.handleKind === "rotate") {
        if (!dragState.startPointerAngle) return;
        const nextPointerAngle = Math.atan2(
          pointer.y - dragState.objectStartCenter.y,
          pointer.x - dragState.objectStartCenter.x,
        );
        const nextAngle =
          dragState.objectStartAngle +
          ((nextPointerAngle - dragState.startPointerAngle) * 180) / Math.PI;

        object.set("angle", nextAngle);
        object.setCoords();
        object.fire("my:custom:seek", { target: object });
        canvas.requestRenderAll();
        return;
      }

      if (!dragState.oppositeCanvasPoint) return;
      const preserveAspectRatio = event.shiftKey;
      const nextCenter = getResizedObjectCenter(dragState, pointer, preserveAspectRatio);
      const nextSize = getResizedObjectSize(dragState, pointer, preserveAspectRatio);
      if (!nextCenter || !nextSize) return;

      applyObjectSize(object, nextSize.width, nextSize.height, dragState);
      object.setPositionByOrigin(nextCenter, "center", "center");
      object.setCoords();
      object.fire("my:custom:seek", { target: object });
      canvas.requestRenderAll();
    };

    /** Finalizes the active DOM handle drag and writes the appropriate keyframes once. */
    const handleWindowPointerUp = () => {
      const dragState = dragStateRef.current;
      dragStateRef.current = null;
      if (!dragState) return;

      if (dragState.handleKind === "rotate") {
        captureNumericSnapshotKeyframes(dragState.selectedIds, ["angle"]);
        return;
      }

      captureNumericSnapshotKeyframes(dragState.selectedIds, [
        "left",
        "top",
        "width",
        "height",
      ]);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [captureNumericSnapshotKeyframes, fabricCanvasRef, getObjectById]);

  /** Starts a DOM-handle drag by capturing the selected object's current transform snapshot. */
  const onHandlePointerDown = (handleKind: HandleKind) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || selectedIds.length === 0 || !selectedObject) return;

    event.preventDefault();
    event.stopPropagation();

    const center = selectedObject.getCenterPoint();
    const scaledWidth = Math.max(1, selectedObject.getScaledWidth());
    const scaledHeight = Math.max(1, selectedObject.getScaledHeight());
    const intrinsicWidth = getIntrinsicDimension(selectedObject.width, scaledWidth, selectedObject.scaleX ?? 1);
    const intrinsicHeight = getIntrinsicDimension(selectedObject.height, scaledHeight, selectedObject.scaleY ?? 1);
    const angleRadians = ((selectedObject.angle ?? 0) * Math.PI) / 180;
    const pointer = screenPointToCanvasPoint(
      fabricCanvasRef.current,
      event.clientX,
      event.clientY,
    );

    const dragState: DragState = {
      aspectRatio: scaledWidth / Math.max(1, scaledHeight),
      anchorCanvasPoint: center,
      baseHeight: scaledHeight,
      baseWidth: scaledWidth,
      handleKind,
      intrinsicHeight,
      intrinsicWidth,
      objectId: selectedId,
      objectStartAngle: selectedObject.angle ?? 0,
      objectStartCenter: center,
      selectedIds: [...selectedIds],
    };

    if (handleKind === "rotate") {
      dragState.startPointerAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x);
    } else {
      dragState.oppositeCanvasPoint = getOppositeAnchorCanvasPoint(center, scaledWidth, scaledHeight, angleRadians, handleKind);
    }

    dragStateRef.current = dragState;
  };

  if (!showOverlay || !geometry) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <polygon
          points={toPolygonPoints(geometry)}
          fill="none"
          stroke={FIGMA_BLUE}
          strokeWidth={1.5}
        />
        <line
          x1={geometry.topCenter.x}
          y1={geometry.topCenter.y}
          x2={geometry.rotateStemEnd.x}
          y2={geometry.rotateStemEnd.y}
          stroke={FIGMA_BLUE}
          strokeWidth={1.5}
        />
      </svg>

      <HandleButton point={geometry.topLeft} onPointerDown={onHandlePointerDown("corner-tl")} />
      <HandleButton point={geometry.topRight} onPointerDown={onHandlePointerDown("corner-tr")} />
      <HandleButton point={geometry.bottomRight} onPointerDown={onHandlePointerDown("corner-br")} />
      <HandleButton point={geometry.bottomLeft} onPointerDown={onHandlePointerDown("corner-bl")} />
      <EdgeHandleButton point={geometry.topCenter} orientation="horizontal" onPointerDown={onHandlePointerDown("edge-top")} />
      <EdgeHandleButton point={geometry.rightCenter} orientation="vertical" onPointerDown={onHandlePointerDown("edge-right")} />
      <EdgeHandleButton point={geometry.bottomCenter} orientation="horizontal" onPointerDown={onHandlePointerDown("edge-bottom")} />
      <EdgeHandleButton point={geometry.leftCenter} orientation="vertical" onPointerDown={onHandlePointerDown("edge-left")} />
      <RotateHandleButton point={geometry.rotateHandle} onPointerDown={onHandlePointerDown("rotate")} />
    </div>
  );
}

type HandleButtonProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  point: ScreenPoint;
};

/** Renders one square corner handle anchored to a screen-space point. */
function HandleButton({ point, onPointerDown }: HandleButtonProps) {
  return (
    <button
      type="button"
      aria-label="Resize selection"
      className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-[#7dd3fc] bg-white shadow-[0_0_0_1px_rgba(29,78,216,0.2)]"
      style={{ left: point.x, top: point.y }}
      onPointerDown={onPointerDown}
    />
  );
}

type EdgeHandleButtonProps = HandleButtonProps & {
  orientation: "horizontal" | "vertical";
};

/** Renders one thin edge handle with a larger hit area than the visible line. */
function EdgeHandleButton({ orientation, point, onPointerDown }: EdgeHandleButtonProps) {
  return (
    <button
      type="button"
      aria-label="Resize selection edge"
      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 bg-transparent"
      style={{
        height: orientation === "horizontal" ? 18 : 30,
        left: point.x,
        top: point.y,
        width: orientation === "horizontal" ? 30 : 18,
      }}
      onPointerDown={onPointerDown}
    >
      <span
        className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7dd3fc]"
        style={{
          height: orientation === "horizontal" ? 2 : 18,
          width: orientation === "horizontal" ? 18 : 2,
        }}
      />
    </button>
  );
}

/** Renders the detached rotation handle above the top edge of the selection. */
function RotateHandleButton({ point, onPointerDown }: HandleButtonProps) {
  return (
    <button
      type="button"
      aria-label="Rotate selection"
      className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-[#7dd3fc] bg-white shadow-[0_0_0_1px_rgba(29,78,216,0.2)]"
      style={{ left: point.x, top: point.y }}
      onPointerDown={onPointerDown}
    />
  );
}

/** Reads the selected object's screen-space control geometry from its rotated bounds. */
function readOverlayGeometry(canvas: NonNullable<ReturnType<typeof useCanvasAppContext>["fabricCanvasRef"]["current"]>, object: FabricObject): OverlayGeometry {
  const center = object.getCenterPoint();
  const halfWidth = object.getScaledWidth() / 2;
  const halfHeight = object.getScaledHeight() / 2;
  const angleRadians = ((object.angle ?? 0) * Math.PI) / 180;

  const topLeft = canvasPointToScreenPoint(canvas, rotateOffset(center, -halfWidth, -halfHeight, angleRadians));
  const topRight = canvasPointToScreenPoint(canvas, rotateOffset(center, halfWidth, -halfHeight, angleRadians));
  const bottomRight = canvasPointToScreenPoint(canvas, rotateOffset(center, halfWidth, halfHeight, angleRadians));
  const bottomLeft = canvasPointToScreenPoint(canvas, rotateOffset(center, -halfWidth, halfHeight, angleRadians));
  const topCenter = midpoint(topLeft, topRight);
  const rightCenter = midpoint(topRight, bottomRight);
  const bottomCenter = midpoint(bottomLeft, bottomRight);
  const leftCenter = midpoint(topLeft, bottomLeft);
  const centerPoint = canvasPointToScreenPoint(canvas, center);
  const outwardUnit = normalizedVector(topCenter, centerPoint);
  const rotateStemEnd = {
    x: topCenter.x - outwardUnit.x * 28,
    y: topCenter.y - outwardUnit.y * 28,
  };
  const rotateHandle = {
    x: topCenter.x - outwardUnit.x * 40,
    y: topCenter.y - outwardUnit.y * 40,
  };

  return {
    bottomCenter,
    bottomLeft,
    bottomRight,
    center: centerPoint,
    leftCenter,
    rightCenter,
    rotateHandle,
    rotateStemEnd,
    topCenter,
    topLeft,
    topRight,
  };
}

/** Converts one canvas-space point into stage-relative screen coordinates. */
function canvasPointToScreenPoint(canvas: NonNullable<ReturnType<typeof useCanvasAppContext>["fabricCanvasRef"]["current"]>, point: Point): ScreenPoint {
  const transform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  return {
    x: transform[0] * point.x + transform[2] * point.y + transform[4],
    y: transform[1] * point.x + transform[3] * point.y + transform[5],
  };
}

/** Converts a viewport-relative pointer position back into canvas coordinates. */
function screenPointToCanvasPoint(
  canvas: ReturnType<typeof useCanvasAppContext>["fabricCanvasRef"]["current"],
  clientX: number,
  clientY: number,
) {
  if (!canvas) return new Point(0, 0);
  const rect = canvas.upperCanvasEl.getBoundingClientRect();
  const transform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const determinant = transform[0] * transform[3] - transform[1] * transform[2];

  if (Math.abs(determinant) <= 0.000001) {
    return new Point(x, y);
  }

  return new Point(
    (transform[3] * (x - transform[4]) - transform[2] * (y - transform[5])) / determinant,
    (-transform[1] * (x - transform[4]) + transform[0] * (y - transform[5])) / determinant,
  );
}

/** Rotates a local offset around the selected object's current center point. */
function rotateOffset(center: Point, offsetX: number, offsetY: number, angleRadians: number) {
  return new Point(
    center.x + offsetX * Math.cos(angleRadians) - offsetY * Math.sin(angleRadians),
    center.y + offsetX * Math.sin(angleRadians) + offsetY * Math.cos(angleRadians),
  );
}

/** Returns the midpoint between two screen-space points. */
function midpoint(start: ScreenPoint, end: ScreenPoint): ScreenPoint {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

/** Computes an outward-facing unit vector from the center through the top edge center. */
function normalizedVector(from: ScreenPoint, to: ScreenPoint) {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const length = Math.hypot(x, y) || 1;
  return {
    x: x / length,
    y: y / length,
  };
}

/** Converts the overlay geometry into an SVG polygon point string. */
function toPolygonPoints(geometry: OverlayGeometry) {
  return [
    geometry.topLeft,
    geometry.topRight,
    geometry.bottomRight,
    geometry.bottomLeft,
  ]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

/** Returns the unscaled intrinsic object dimension needed to preserve current scaling math. */
function getIntrinsicDimension(rawDimension: number | undefined, scaledDimension: number, scale: number) {
  if (Number.isFinite(rawDimension) && Number(rawDimension) > 0) {
    return Number(rawDimension);
  }
  if (Math.abs(scale) > 0.0001) {
    return scaledDimension / scale;
  }
  return scaledDimension;
}

/** Resolves the fixed opposite anchor point for a resize handle in canvas space. */
function getOppositeAnchorCanvasPoint(
  center: Point,
  width: number,
  height: number,
  angleRadians: number,
  handleKind: Exclude<HandleKind, "rotate">,
) {
  switch (handleKind) {
    case "corner-tl":
      return rotateOffset(center, width / 2, height / 2, angleRadians);
    case "corner-tr":
      return rotateOffset(center, -width / 2, height / 2, angleRadians);
    case "corner-br":
      return rotateOffset(center, -width / 2, -height / 2, angleRadians);
    case "corner-bl":
      return rotateOffset(center, width / 2, -height / 2, angleRadians);
    case "edge-top":
      return rotateOffset(center, 0, height / 2, angleRadians);
    case "edge-right":
      return rotateOffset(center, -width / 2, 0, angleRadians);
    case "edge-bottom":
      return rotateOffset(center, 0, -height / 2, angleRadians);
    case "edge-left":
      return rotateOffset(center, width / 2, 0, angleRadians);
  }
}

/** Computes the new object size in canvas space for the active resize handle drag. */
function getResizedObjectSize(
  dragState: DragState,
  pointer: Point,
  preserveAspectRatio: boolean,
) {
  const angleRadians = (dragState.objectStartAngle * Math.PI) / 180;
  const localPointer = rotatePointIntoLocalSpace(
    pointer.subtract(dragState.oppositeCanvasPoint as Point),
    -angleRadians,
  );
  const minimumSize = 8;
  const absoluteWidth = Math.max(minimumSize, Math.abs(localPointer.x));
  const absoluteHeight = Math.max(minimumSize, Math.abs(localPointer.y));

  switch (dragState.handleKind) {
    case "corner-tl":
    case "corner-br":
    case "corner-tr":
    case "corner-bl":
      return preserveAspectRatio
        ? getAspectLockedSize(dragState, absoluteWidth, absoluteHeight)
        : {
            width: absoluteWidth,
            height: absoluteHeight,
          };
    case "edge-top":
    case "edge-bottom":
      if (preserveAspectRatio) {
        return getAspectLockedSizeFromHeight(
          dragState,
          absoluteHeight,
        );
      }
      return {
        width: dragState.baseWidth,
        height: absoluteHeight,
      };
    case "edge-left":
    case "edge-right":
      if (preserveAspectRatio) {
        return getAspectLockedSizeFromWidth(
          dragState,
          absoluteWidth,
        );
      }
      return {
        width: absoluteWidth,
        height: dragState.baseHeight,
      };
    case "rotate":
      return null;
  }
}

/** Computes the new center point that keeps the opposite edge or corner anchored. */
function getResizedObjectCenter(
  dragState: DragState,
  pointer: Point,
  preserveAspectRatio: boolean,
) {
  const angleRadians = (dragState.objectStartAngle * Math.PI) / 180;
  const nextSize = getResizedObjectSize(dragState, pointer, preserveAspectRatio);
  if (!nextSize) return null;
  const width = nextSize.width;
  const height = nextSize.height;

  let localCenter = new Point(0, 0);
  switch (dragState.handleKind) {
    case "corner-tl":
      localCenter = new Point(-width / 2, -height / 2);
      break;
    case "corner-tr":
      localCenter = new Point(width / 2, -height / 2);
      break;
    case "corner-br":
      localCenter = new Point(width / 2, height / 2);
      break;
    case "corner-bl":
      localCenter = new Point(-width / 2, height / 2);
      break;
    case "edge-top":
      localCenter = new Point(0, -height / 2);
      break;
    case "edge-right":
      localCenter = new Point(width / 2, 0);
      break;
    case "edge-bottom":
      localCenter = new Point(0, height / 2);
      break;
    case "edge-left":
      localCenter = new Point(-width / 2, 0);
      break;
    case "rotate":
      return null;
  }

  const worldOffset = rotatePointIntoLocalSpace(localCenter, angleRadians);
  return (dragState.oppositeCanvasPoint as Point).add(worldOffset);
}

/** Rotates a point around the origin by the provided angle. */
function rotatePointIntoLocalSpace(point: Point, angleRadians: number) {
  return new Point(
    point.x * Math.cos(angleRadians) - point.y * Math.sin(angleRadians),
    point.x * Math.sin(angleRadians) + point.y * Math.cos(angleRadians),
  );
}

/** Applies a new scaled size to the object while preserving its intrinsic dimensions. */
function applyObjectSize(object: FabricObject, nextWidth: number, nextHeight: number, dragState: DragState) {
  object.set({
    scaleX: nextWidth / dragState.intrinsicWidth,
    scaleY: nextHeight / dragState.intrinsicHeight,
  });
}

/** Keeps corner resizes proportional using the drag state's original aspect ratio. */
function getAspectLockedSize(
  dragState: DragState,
  absoluteWidth: number,
  absoluteHeight: number,
) {
  const ratio = dragState.aspectRatio || 1;
  const widthFromHeight = absoluteHeight * ratio;
  const heightFromWidth = absoluteWidth / ratio;

  if (absoluteWidth / Math.max(1, absoluteHeight) >= ratio) {
    return {
      width: absoluteWidth,
      height: Math.max(8, heightFromWidth),
    };
  }

  return {
    width: Math.max(8, widthFromHeight),
    height: absoluteHeight,
  };
}

/** Derives a proportional size from a height-led edge drag. */
function getAspectLockedSizeFromHeight(dragState: DragState, height: number) {
  return {
    width: Math.max(8, height * (dragState.aspectRatio || 1)),
    height,
  };
}

/** Derives a proportional size from a width-led edge drag. */
function getAspectLockedSizeFromWidth(dragState: DragState, width: number) {
  return {
    width,
    height: Math.max(8, width / Math.max(0.0001, dragState.aspectRatio || 1)),
  };
}
