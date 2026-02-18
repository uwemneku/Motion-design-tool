import { Canvas, Point } from "fabric";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { dispatchableSelector, type RootState } from "../../store";
import type { AppDispatch } from "../../store";
import {
  removeItemRecord,
  setSelectedId,
  upsertItemRecord,
} from "../../store/editor-slice";
import {
  applyFigmaLikeControls,
  syncObjectControlBorderScale,
} from "./fabric-controls";
import { initAligningGuidelines } from "fabric/extensions";
import { useCanvasAppContext } from "./use-canvas-app-context";
import type { AnimatableProperties } from "../shapes/animatable-object/types";

const KEYFRAME_EPSILON = 0.001;
const MIN_CANVAS_ZOOM = 0.25;
const MAX_CANVAS_ZOOM = 4;
const CANVAS_ZOOM_SENSITIVITY = 0.05;
const NUMERIC_ANIMATABLE_PROPERTIES: (keyof AnimatableProperties)[] = [
  "left",
  "top",
  "scaleX",
  "scaleY",
  "opacity",
  "angle",
];

function getPropertiesForTransformAction(action?: string) {
  if (!action) return NUMERIC_ANIMATABLE_PROPERTIES;
  if (action === "drag") return ["left", "top"] as (keyof AnimatableProperties)[];
  if (action === "rotate") return ["angle"] as (keyof AnimatableProperties)[];
  if (action === "scale" || action === "scaleX" || action === "scaleY") {
    return ["scaleX", "scaleY"] as (keyof AnimatableProperties)[];
  }
  return NUMERIC_ANIMATABLE_PROPERTIES;
}

function createKeyframeMarkerId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `kf-${crypto.randomUUID()}`;
  }
  return `kf-${Math.random().toString(36).slice(2, 10)}`;
}

function useFabricEditor() {
  const fabricRef = useRef<Canvas | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { instancesRef, getInstanceById, unregisterInstance, clearInstances } =
    useCanvasAppContext();
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const playheadTime = useSelector(
    (state: RootState) => state.editor.playheadTime,
  );

  const bindHost = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (!node || fabricRef.current) return;
      let isPanning = false;
      let lastPanX = 0;
      let lastPanY = 0;
      const transformActionById = new Map<string, string>();

      fabricRef.current = new Canvas(node, {
        width: node.clientWidth,
        height: node.clientHeight,
        backgroundColor: "#2c2c2c",
        preserveObjectStacking: true,
        selection: true,
      });
      initAligningGuidelines(fabricRef.current, { color: "rgb(81 162 255)" });

      applyFigmaLikeControls(fabricRef.current);

      fabricRef.current.on("selection:created", (event) => {
        const customId = event.selected?.[0]?.customId ?? null;
        dispatch(setSelectedId(customId));
      });

      fabricRef.current.on("selection:updated", (event) => {
        const customId = event.selected?.[0]?.customId ?? null;
        dispatch(setSelectedId(customId));
      });

      fabricRef.current.on("selection:cleared", () => {
        dispatch(setSelectedId(null));
      });

      fabricRef.current.on("object:modified", ({ target }) => {
        const customId = target?.customId;
        if (!customId) return;

        const instance = getInstanceById(customId);
        if (!instance) return;

        const timestamp = dispatch(
          dispatchableSelector((state) => state.editor.playheadTime),
        );
        const snapshot = instance.getSnapshot();
        const action = transformActionById.get(customId);
        const changedProperties = getPropertiesForTransformAction(action);
        changedProperties.forEach((property) => {
          instance.addKeyframe({
            property,
            value: snapshot[property],
            time: timestamp,
            easing: "linear",
          });
        });
        transformActionById.delete(customId);

        const existing = dispatch(
          dispatchableSelector((state) => state.editor.itemsRecord[customId]),
        );
        if (!existing) return;

        const hasAtTimestamp = existing.keyframe.some(
          (keyframe) =>
            Math.abs(keyframe.timestamp - timestamp) <= KEYFRAME_EPSILON,
        );
        const nextKeyframes = hasAtTimestamp
          ? existing.keyframe
          : [
              ...existing.keyframe,
              { id: createKeyframeMarkerId(), timestamp },
            ].sort((a, b) => a.timestamp - b.timestamp);

        dispatch(
          upsertItemRecord({
            id: customId,
            value: {
              ...existing,
              keyframe: nextKeyframes,
            },
          }),
        );
      });

      fabricRef.current.on("before:transform", ({ transform }) => {
        const customId = transform?.target?.customId;
        const action = transform?.action;
        if (!customId || !action) return;
        transformActionById.set(customId, action);
      });

      fabricRef.current.on("mouse:wheel", (event) => {
        const wheelEvent = event.e as WheelEvent;
        const canvas = fabricRef.current;
        if (!canvas) return;

        const isGestureZoom = wheelEvent.ctrlKey || wheelEvent.metaKey;
        if (isGestureZoom) {
          const zoomDelta = -wheelEvent.deltaY * CANVAS_ZOOM_SENSITIVITY;
          const nextZoom = Math.min(
            MAX_CANVAS_ZOOM,
            Math.max(MIN_CANVAS_ZOOM, canvas.getZoom() * (1 + zoomDelta)),
          );
          const zoomPoint = new Point(wheelEvent.offsetX, wheelEvent.offsetY);
          canvas.zoomToPoint(zoomPoint, nextZoom);
          syncObjectControlBorderScale(canvas);
        } else {
          canvas.relativePan(new Point(-wheelEvent.deltaX, -wheelEvent.deltaY));
        }

        wheelEvent.preventDefault();
        wheelEvent.stopPropagation();
      });

      fabricRef.current.on("mouse:down", (event) => {
        const pointerEvent = event.e as MouseEvent;
        const shouldStartPan = pointerEvent.altKey || pointerEvent.button === 1;
        if (!shouldStartPan) return;

        isPanning = true;
        lastPanX = pointerEvent.clientX;
        lastPanY = pointerEvent.clientY;
        fabricRef.current!.selection = false;
        fabricRef.current!.defaultCursor = "grabbing";
      });

      fabricRef.current.on("mouse:move", (event) => {
        if (!isPanning) return;
        const pointerEvent = event.e as MouseEvent;
        const canvas = fabricRef.current;
        if (!canvas) return;

        const deltaX = pointerEvent.clientX - lastPanX;
        const deltaY = pointerEvent.clientY - lastPanY;
        canvas.relativePan(new Point(deltaX, deltaY));

        lastPanX = pointerEvent.clientX;
        lastPanY = pointerEvent.clientY;
      });

      fabricRef.current.on("mouse:up", () => {
        if (!isPanning) return;
        isPanning = false;
        if (!fabricRef.current) return;
        fabricRef.current.selection = true;
        fabricRef.current.defaultCursor = "default";
      });
    },
    [dispatch, getInstanceById],
  );

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 1) {
      // Do not collapse multi-selection into a single selectedId target.
      return;
    }

    if (!selectedId) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      return;
    }

    const selectedObject = canvas
      .getObjects()
      .find((object) => object.customId === selectedId);

    if (!selectedObject) return;
    canvas.setActiveObject(selectedObject);
    canvas.requestRenderAll();
  }, [selectedId]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    instancesRef.current.forEach((instance) => {
      instance.seek(playheadTime);
    });
    canvas.requestRenderAll();
  }, [instancesRef, playheadTime]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const canvas = fabricRef.current;
      if (!canvas) return;

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length === 0) return;

      event.preventDefault();

      activeObjects.forEach((object) => {
        const customId = object.customId;
        canvas.remove(object);

        if (!customId) return;
        unregisterInstance(customId);
        dispatch(removeItemRecord(customId));
      });

      canvas.discardActiveObject();
      canvas.requestRenderAll();
      dispatch(setSelectedId(null));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dispatch, unregisterInstance]);

  useEffect(() => {
    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null;
      clearInstances();
    };
  }, [clearInstances]);

  return { bindHost, fabricCanvas: fabricRef };
}

export default useFabricEditor;
