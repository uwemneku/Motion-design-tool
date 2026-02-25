/** Canvas App Context.Tsx module implementation. */
import { Canvas, Point } from "fabric";
import {
  useCallback,
  useMemo,
  useRef,
  type MutableRefObject,
  type PropsWithChildren,
} from "react";
import type { AnimatableObject } from "../../shapes/animatable-object/object";
import { CanvasAppContext } from "../hooks/use-canvas-app-context";
import {
  createKeyframeMarkerId,
  getHostContainerSize,
  getPropertiesForTransformAction,
  hoverOutlineRect,
  showGlobalHoverOutlineForObject,
} from "../hooks/util";
import {
  applyFigmaLikeControls,
  syncObjectControlBorderScale,
} from "../util/fabric-controls";
import {
  setProjectInfo,
  setSelectedId,
  upsertItemRecord,
} from "../../../store/editor-slice";
import { dispatchableSelector, useAppDispatch } from "../../../store";
import {
  CANVAS_KEYFRAME_EPSILON,
  CANVAS_ZOOM_SENSITIVITY,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
} from "../../../../const";

type CanvasInstanceStore = Map<string, AnimatableObject>;

export type CanvasAppContextValue = {
  fabricCanvasRef: MutableRefObject<Canvas | null>;
  instancesRef: MutableRefObject<CanvasInstanceStore>;
  addCanvasObject: (id: string, instance: AnimatableObject) => void;
  deleteCanvasObject: (id: string) => void;
  deleteAllStoredCanvasObject: () => void;
  getObjectById: (id: string) => AnimatableObject | undefined;
  bindHost: (node: HTMLCanvasElement | null) => void;
};

/** Provides a shared registry of live canvas object instances. */
export function CanvasAppProvider({ children }: PropsWithChildren) {
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const instancesRef = useRef<CanvasInstanceStore>(new Map());
  const fabricContainerRef = useRef<HTMLCanvasElement | null>(null);
  const dispatch = useAppDispatch();

  const getInstanceById = (id: string) => instancesRef.current.get(id);

  const bindHost = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (fabricCanvasRef.current || !node) return;

      let isPanning = false;
      let lastPanX = 0;
      let lastPanY = 0;

      fabricContainerRef.current = node;
      const transformActionById = new Map<string, string>();
      const { height, width } = getHostContainerSize(node);
      const _canvas = new Canvas(node, {
        width,
        height,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
        selection: true,
        subTargetCheck: true,
      });
      fabricCanvasRef.current = _canvas;

      applyFigmaLikeControls(_canvas);
      _canvas.add(hoverOutlineRect);

      _canvas.on("selection:created", (event) => {
        const customId = event.selected?.[0]?.customId ?? null;
        if (customId) {
          hoverOutlineRect.set({ visible: false });
        }
        dispatch(setSelectedId(customId));
      });

      _canvas.on("selection:updated", (event) => {
        const customId = event.selected?.[0]?.customId ?? null;
        dispatch(setSelectedId(customId));
      });

      _canvas.on("selection:cleared", () => {
        dispatch(setSelectedId(null));
      });

      _canvas.on("object:modified", ({ target }) => {
        const customId = target?.customId;
        if (!customId) return;

        const instance = getInstanceById(customId);
        if (!instance) return;

        const timestamp = dispatch(
          dispatchableSelector((state) => state.editor.playHeadTime),
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
            Math.abs(keyframe.timestamp - timestamp) <= CANVAS_KEYFRAME_EPSILON,
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

      _canvas.on("before:transform", ({ transform }) => {
        const customId = transform?.target?.customId;
        const action = transform?.action;
        if (!customId || !action) return;
        transformActionById.set(customId, action);
        // const target = transform?.target;
        // const instance = instancesRef.current.get(customId);
        // preTransformSnapshotByIdRef.current.set(customId, {
        //   transform: readTransformSnapshot(target ?? {}),
        //   itemRecord: dispatch(
        //     dispatchableSelector((state) => state.editor.itemsRecord[customId]),
        //   ),
        //   instanceKeyframes: structuredClone(instance?.keyframes ?? {}),
        //   instanceColorKeyframes: structuredClone(
        //     instance?.colorKeyframes ?? {},
        //   ),
        // });
      });

      _canvas.on("mouse:wheel", (event) => {
        const wheelEvent = event.e as WheelEvent;
        const isGestureZoom = wheelEvent.ctrlKey || wheelEvent.metaKey;
        if (isGestureZoom) {
          const zoomDelta = -wheelEvent.deltaY * CANVAS_ZOOM_SENSITIVITY;
          const nextZoom = Math.min(
            MAX_CANVAS_ZOOM,
            Math.max(MIN_CANVAS_ZOOM, _canvas.getZoom() * (1 + zoomDelta)),
          );
          const zoomPoint = new Point(wheelEvent.offsetX, wheelEvent.offsetY);
          _canvas.zoomToPoint(zoomPoint, nextZoom);
          dispatch(setProjectInfo({ canvasZoom: nextZoom }));

          syncObjectControlBorderScale(_canvas);
        } else {
          _canvas.relativePan(
            new Point(-wheelEvent.deltaX, -wheelEvent.deltaY),
          );
        }
        wheelEvent.preventDefault();
        wheelEvent.stopPropagation();
      });

      _canvas.on("mouse:down", (event) => {
        const pointerEvent = event.e as MouseEvent;
        const shouldStartPan = pointerEvent.altKey || pointerEvent.button === 1;
        if (!shouldStartPan) return;

        isPanning = true;
        hoverOutlineRect.set({ visible: false });
        lastPanX = pointerEvent.clientX;
        lastPanY = pointerEvent.clientY;
        _canvas.selection = false;
        _canvas.defaultCursor = "grabbing";
      });

      _canvas.on("mouse:move", (event) => {
        if (!isPanning) return;
        const pointerEvent = event.e as MouseEvent;

        const deltaX = pointerEvent.clientX - lastPanX;
        const deltaY = pointerEvent.clientY - lastPanY;
        _canvas.relativePan(new Point(deltaX, deltaY));

        lastPanX = pointerEvent.clientX;
        lastPanY = pointerEvent.clientY;
      });

      _canvas.on("mouse:up", () => {
        if (!isPanning) return;
        isPanning = false;
        _canvas.selection = true;
        _canvas.defaultCursor = "default";
      });

      _canvas.on("mouse:over", (event) => {
        const nextHovered = event.target ?? null;
        const customId = nextHovered?.customId;
        const isSelected = _canvas?.getActiveObject()?.customId === customId;
        if (!customId || typeof customId !== "string" || isSelected) return;
        showGlobalHoverOutlineForObject(nextHovered);
        // isHoveredRef.current = true;
        _canvas?.requestRenderAll();
      });

      _canvas.on("mouse:out", () => {
        hoverOutlineRect.set({ visible: false });
      });
    },
    [dispatch],
  );

  const value = useMemo<CanvasAppContextValue>(
    () => ({
      fabricCanvasRef,
      instancesRef,
      addCanvasObject: (id: string, instance: AnimatableObject) => {
        instancesRef.current.set(id, instance);
      },
      deleteCanvasObject: (id: string) => {
        instancesRef.current.delete(id);
      },
      deleteAllStoredCanvasObject: () => {
        instancesRef.current.clear();
      },
      getObjectById: (id: string) => instancesRef.current.get(id),
      bindHost,
    }),
    [bindHost],
  );

  return (
    <CanvasAppContext.Provider value={value}>
      {children}
    </CanvasAppContext.Provider>
  );
}
