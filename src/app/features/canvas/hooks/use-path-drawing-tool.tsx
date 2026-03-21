/** Use Path Drawing Tool.Tsx canvas path-tool mode and preview logic. */
import { Path, Point, type TPointerEvent, type TPointerEventInfo } from "fabric";
import { useEffect, useRef } from "react";
import { setActiveCanvasTool, setSelectedId } from "../../../store/editor-slice";
import { useAppDispatch, useAppSelector } from "../../../store";
import { useCanvasAppContext } from "./use-canvas-app-context";
import { useCanvasItems } from "./use-canvas-items";

type PenAnchor = {
  inHandle: Point | null;
  outHandle: Point | null;
  point: Point;
};

type DraftState = {
  anchors: PenAnchor[];
  dragStart: Point;
  isDraggingHandle: boolean;
  preview: Path;
};

const PREVIEW_STROKE = "#8dabff";
const CLOSE_ANCHOR_DISTANCE_PX = 12;
const HANDLE_DRAG_THRESHOLD_PX = 4;

/** Mounts the interactive click-to-place path tool on the Fabric stage. */
export function PathDrawingTool() {
  const dispatch = useAppDispatch();
  const { fabricCanvasRef } = useCanvasAppContext();
  const { addPathFromData } = useCanvasItems({ fabricCanvas: fabricCanvasRef });
  const activeCanvasTool = useAppSelector((state) => state.editor.activeCanvasTool);
  const draftRef = useRef<DraftState | null>(null);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    /** Builds SVG path data from committed pen anchors and an optional live pointer. */
    const buildPathData = (
      anchors: PenAnchor[],
      pointer: Point | null = null,
      closePath = false,
    ) => {
      if (anchors.length === 0) return "";

      const commands = [
        `M ${toPathNumber(anchors[0].point.x)} ${toPathNumber(anchors[0].point.y)}`,
      ];
      for (let index = 1; index < anchors.length; index += 1) {
        commands.push(buildSegmentCommand(anchors[index - 1], anchors[index]));
      }

      if (pointer) {
        commands.push(
          buildSegmentCommand(anchors[anchors.length - 1], {
            point: pointer,
            inHandle: null,
            outHandle: null,
          }),
        );
      }

      if (closePath && anchors.length >= 2) {
        commands.push(buildSegmentCommand(anchors[anchors.length - 1], anchors[0]));
      }

      return commands.join(" ");
    };

    /** Clears any in-progress path preview from the canvas. */
    const clearDraft = () => {
      const draft = draftRef.current;
      if (!draft) return;
      canvas.remove(draft.preview);
      draftRef.current = null;
      canvas.requestRenderAll();
    };

    /** Commits the current draft path into a real canvas object. */
    const finishDraft = (closePath = false) => {
      const draft = draftRef.current;
      if (!draft) return;
      const pathData = buildPathData(draft.anchors, null, closePath);
      clearDraft();
      if (pathData.length === 0 || draft.anchors.length < 2) {
        dispatch(setActiveCanvasTool("select"));
        return;
      }
      addPathFromData(pathData, {}, closePath);
      dispatch(setActiveCanvasTool("select"));
    };

    /** Updates the preview path to include the latest pointer or handle change. */
    const updatePreview = (pointer: Point) => {
      const draft = draftRef.current;
      if (!draft) return;

      const nextPreview = createPreviewPath(buildPathData(draft.anchors, pointer));
      canvas.remove(draft.preview);
      draft.preview = nextPreview;
      canvas.add(nextPreview);
      canvas.requestRenderAll();
    };

    /** Creates the initial preview object the first time the user clicks the stage. */
    const ensureDraft = (startPoint: Point) => {
      if (draftRef.current) return draftRef.current;

      const firstAnchor: PenAnchor = {
        point: startPoint,
        inHandle: null,
        outHandle: null,
      };
      const preview = createPreviewPath(
        buildPathData([firstAnchor], startPoint) || `M ${startPoint.x} ${startPoint.y}`,
      );
      canvas.add(preview);
      draftRef.current = {
        anchors: [firstAnchor],
        dragStart: startPoint,
        isDraggingHandle: false,
        preview,
      };
      return draftRef.current;
    };

    /** Starts a new anchor and enters handle-drag mode if the pointer moves. */
    const handleMouseDown = (event: TPointerEventInfo<TPointerEvent>) => {
      if (activeCanvasTool !== "path") return;
      if (!(event.e instanceof MouseEvent) || event.e.button !== 0) return;

      const pointer = canvas.getScenePoint(event.e);
      const nextPoint = new Point(pointer.x, pointer.y);
      const draft = ensureDraft(nextPoint);
      const firstAnchor = draft.anchors[0];

      if (
        draft.anchors.length >= 3 &&
        isPointNearAnchor(nextPoint, firstAnchor.point, CLOSE_ANCHOR_DISTANCE_PX)
      ) {
        finishDraft(true);
        event.e.preventDefault();
        event.e.stopPropagation();
        return;
      }

      if (draft.anchors.length === 1 && draft.anchors[0].point.eq(nextPoint)) {
        draft.dragStart = nextPoint;
        draft.isDraggingHandle = false;
      } else {
        draft.anchors.push({
          point: nextPoint,
          inHandle: null,
          outHandle: null,
        });
        draft.dragStart = nextPoint;
        draft.isDraggingHandle = false;
      }
      updatePreview(nextPoint);
      event.e.preventDefault();
      event.e.stopPropagation();
    };

    /** Keeps the draft preview updated while hovering or dragging a bezier handle. */
    const handleMouseMove = (event: TPointerEventInfo<TPointerEvent>) => {
      if (activeCanvasTool !== "path" || !draftRef.current) return;
      const pointer = canvas.getScenePoint(event.e);
      const nextPoint = new Point(pointer.x, pointer.y);
      const draft = draftRef.current;
      const activeAnchor = draft.anchors[draft.anchors.length - 1];
      const firstAnchor = draft.anchors[0];
      const previewPointer =
        draft.anchors.length >= 3 &&
        isPointNearAnchor(nextPoint, firstAnchor.point, CLOSE_ANCHOR_DISTANCE_PX)
          ? firstAnchor.point
          : nextPoint;
      if (event.e instanceof MouseEvent && (event.e.buttons & 1) === 1) {
        const dragDistance = Math.hypot(
          nextPoint.x - draft.dragStart.x,
          nextPoint.y - draft.dragStart.y,
        );
        if (dragDistance >= HANDLE_DRAG_THRESHOLD_PX) {
          draft.isDraggingHandle = true;
          const opposite = new Point(
            activeAnchor.point.x - (nextPoint.x - activeAnchor.point.x),
            activeAnchor.point.y - (nextPoint.y - activeAnchor.point.y),
          );
          activeAnchor.outHandle = nextPoint;
          activeAnchor.inHandle = opposite;
        }
      }
      updatePreview(previewPointer);
    };

    /** Finalizes the active anchor, or finishes the path on double click. */
    const handleMouseUp = (event: TPointerEventInfo<TPointerEvent>) => {
      if (activeCanvasTool !== "path") return;
      if (!(event.e instanceof MouseEvent) || event.e.button !== 0) return;

      const draft = draftRef.current;
      if (!draft) return;

      if (event.e.detail >= 2 && draft.anchors.length >= 2) {
        finishDraft();
        event.e.preventDefault();
        event.e.stopPropagation();
        return;
      }

      const pointer = canvas.getScenePoint(event.e);
      updatePreview(new Point(pointer.x, pointer.y));
    };

    /** Supports enter-to-finish and escape-to-cancel while the tool is active. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeCanvasTool !== "path") return;
      if (event.key === "Escape") {
        clearDraft();
        dispatch(setActiveCanvasTool("select"));
        dispatch(setSelectedId([]));
      }
      if (event.key === "Enter") {
        finishDraft();
      }
    };

    if (activeCanvasTool === "path") {
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.skipTargetFind = true;
      canvas.defaultCursor = "crosshair";
      dispatch(setSelectedId([]));
      canvas.requestRenderAll();
    } else {
      clearDraft();
      canvas.selection = true;
      canvas.skipTargetFind = false;
      canvas.defaultCursor = "default";
      canvas.requestRenderAll();
    }

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      clearDraft();
      canvas.selection = true;
      canvas.skipTargetFind = false;
      canvas.defaultCursor = "default";
    };
  }, [activeCanvasTool, addPathFromData, dispatch, fabricCanvasRef]);

  return null;
}

/** Converts numbers into compact SVG path command tokens. */
function toPathNumber(value: number) {
  return Number(value.toFixed(2));
}

/** Creates the temporary preview path shown while the pen tool is active. */
function createPreviewPath(pathData: string) {
  return new Path(pathData, {
    evented: false,
    excludeFromExport: true,
    fill: "",
    objectCaching: false,
    selectable: false,
    stroke: PREVIEW_STROKE,
    strokeDashArray: [6, 4],
    strokeLineCap: "round",
    strokeLineJoin: "round",
    strokeWidth: 2,
  });
}

/** Builds either a straight or cubic segment command between two pen anchors. */
function buildSegmentCommand(start: PenAnchor, end: PenAnchor) {
  const startControl = start.outHandle ?? start.point;
  const endControl = end.inHandle ?? end.point;

  return [
    "C",
    toPathNumber(startControl.x),
    toPathNumber(startControl.y),
    toPathNumber(endControl.x),
    toPathNumber(endControl.y),
    toPathNumber(end.point.x),
    toPathNumber(end.point.y),
  ].join(" ");
}

/** Returns true when the current pointer is close enough to the first anchor to close the path. */
function isPointNearAnchor(point: Point, anchor: Point, maxDistance: number) {
  return Math.hypot(point.x - anchor.x, point.y - anchor.y) <= maxDistance;
}
