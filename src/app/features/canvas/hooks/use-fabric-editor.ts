/** Use Fabric Editor.Ts hook logic. */
import { Canvas, Point, util, type FabricObject } from "fabric";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { dispatchableSelector, type RootState } from "../../../store";
import type { AppDispatch } from "../../../store";
import {
  removeItemRecord,
  setSelectedId,
  upsertItemRecord,
} from "../../../store/editor-slice";
import {
  requestRedo,
  requestUndo,
  setHistoryAvailability,
} from "../../../store/history-slice";
import {
  applyFigmaLikeControls,
  syncObjectControlBorderScale,
} from "../util/fabric-controls";
import { useCanvasAppContext } from "./use-canvas-app-context";
import { AnimatableObject } from "../../shapes/animatable-object/object";
import type { AnimatableProperties } from "../../shapes/animatable-object/types";
import type {
  ColorKeyframesByProperty,
  KeyframesByProperty,
} from "../../shapes/animatable-object/types";
import {
  CANVAS_KEYFRAME_EPSILON,
  CANVAS_ZOOM_SENSITIVITY,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  NONE_MASK_SOURCE_ID,
  NUMERIC_ANIMATABLE_PROPERTIES,
} from "../../../../const";
import {
  MASK_HISTORY_EVENT_NAME,
  type MaskHistoryEventDetail,
} from "../util/mask-history-events";
import { setMaskSourceForInstance } from "../util/masking-util";
import { AI_STEP_COMPLETE_EVENT } from "../../ai/editor-ai-events";

/** Returns stable pixel dimensions derived from the canvas host container. */
function getHostContainerSize(container: HTMLDivElement) {
  return {
    height: Math.max(1, Math.round(container.clientHeight)),
    width: Math.max(1, Math.round(container.clientWidth)),
  };
}

/** Syncs Fabric canvas dimensions to its host container dimensions. */
function syncCanvasSizeToContainer(canvas: Canvas, container: HTMLDivElement) {
  const { height, width } = getHostContainerSize(container);
  if (canvas.getWidth() === width && canvas.getHeight() === height) return;
  canvas.setDimensions({ height, width });
  canvas.requestRenderAll();
}

function getPropertiesForTransformAction(action?: string) {
  if (!action) return NUMERIC_ANIMATABLE_PROPERTIES;
  if (action === "drag")
    return ["left", "top"] as (keyof AnimatableProperties)[];
  if (action === "rotate") return ["angle"] as (keyof AnimatableProperties)[];
  if (action === "scale" || action === "scaleX" || action === "scaleY") {
    return [
      "left",
      "top",
      "scaleX",
      "scaleY",
    ] as (keyof AnimatableProperties)[];
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

type CanvasHistoryAction = {
  redo: () => void;
  undo: () => void;
};

type ItemMutationSnapshot = {
  customId: string;
  instance?: {
    colorKeyframes: ColorKeyframesByProperty;
    keyframes: KeyframesByProperty;
  };
  itemRecord?: RootState["editor"]["itemsRecord"][string];
};

type TransformSnapshot = {
  angle: number;
  left: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  top: number;
};

type MaskTrackingFabricObject = FabricObject & {
  __maskProxyObject?: FabricObject;
  __maskSourceObject?: FabricObject;
};

function readTransformSnapshot(object: {
  angle?: number;
  left?: number;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
  top?: number;
}): TransformSnapshot {
  return {
    left: Number.isFinite(object.left) ? Number(object.left) : 0,
    top: Number.isFinite(object.top) ? Number(object.top) : 0,
    scaleX: Number.isFinite(object.scaleX) ? Number(object.scaleX) : 1,
    scaleY: Number.isFinite(object.scaleY) ? Number(object.scaleY) : 1,
    opacity: Number.isFinite(object.opacity) ? Number(object.opacity) : 1,
    angle: Number.isFinite(object.angle) ? Number(object.angle) : 0,
  };
}

function syncMaskProxyForObject(object: FabricObject) {
  // Keep a target's clip-path proxy in sync with an animated mask source object.
  const maskTarget = object as MaskTrackingFabricObject;
  const maskProxy = maskTarget.__maskProxyObject;
  const maskSource = maskTarget.__maskSourceObject;
  if (!maskProxy || !maskSource) return;

  maskProxy.set({
    left: maskSource.left,
    top: maskSource.top,
    scaleX: maskSource.scaleX,
    scaleY: maskSource.scaleY,
    angle: maskSource.angle,
    skewX: maskSource.skewX,
    skewY: maskSource.skewY,
    flipX: maskSource.flipX,
    flipY: maskSource.flipY,
    originX: maskSource.originX,
    originY: maskSource.originY,
  });
  if (object.clipPath !== maskProxy) {
    object.set("clipPath", maskProxy);
  }
  maskProxy.setCoords();
}

function useFabricEditor() {
  const fabricRef = useRef<Canvas | null>(null);
  const hostCanvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const hostElementRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const {
    setFabricCanvasInstance,
    instancesRef,
    getInstanceById,
    unregisterInstance,
    clearInstances,
    registerInstance,
  } = useCanvasAppContext();
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const playheadTime = useSelector(
    (state: RootState) => state.editor.playheadTime,
  );
  const undoRequestVersion = useSelector(
    (state: RootState) => state.history.undoRequestVersion,
  );
  const redoRequestVersion = useSelector(
    (state: RootState) => state.history.redoRequestVersion,
  );
  const pastActionsRef = useRef<CanvasHistoryAction[]>([]);
  const futureActionsRef = useRef<CanvasHistoryAction[]>([]);
  const isHistoryReplayRef = useRef(false);
  const preTransformSnapshotByIdRef = useRef<
    Map<
      string,
      {
        instanceColorKeyframes: ColorKeyframesByProperty;
        instanceKeyframes: KeyframesByProperty;
        itemRecord?: RootState["editor"]["itemsRecord"][string];
        transform: TransformSnapshot;
      }
    >
  >(new Map());
  const hoveredObjectRef = useRef<FabricObject | null>(null);

  const syncHistoryState = () => {
    dispatch(
      setHistoryAvailability({
        canUndo: pastActionsRef.current.length > 0,
        canRedo: futureActionsRef.current.length > 0,
      }),
    );
  };

  useEffect(() => {
    dispatch(setHistoryAvailability({ canUndo: false, canRedo: false }));
    return () => {
      dispatch(setHistoryAvailability({ canUndo: false, canRedo: false }));
    };
  }, [dispatch]);

  const pushHistoryAction = (action: CanvasHistoryAction) => {
    if (isHistoryReplayRef.current) return;
    pastActionsRef.current.push(action);
    if (pastActionsRef.current.length > 100) {
      pastActionsRef.current.shift();
    }
    futureActionsRef.current = [];
    syncHistoryState();
  };

  const buildItemMutationSnapshot = (
    id: string,
  ): ItemMutationSnapshot | null => {
    const instance = instancesRef.current.get(id);
    const itemRecord = dispatch(
      dispatchableSelector((state) => state.editor.itemsRecord[id]),
    );
    if (!instance && !itemRecord) return null;

    return {
      customId: id,
      itemRecord: itemRecord
        ? {
            name: itemRecord.name,
            keyframe: itemRecord.keyframe.map((marker) => ({ ...marker })),
          }
        : undefined,
      instance: instance
        ? {
            keyframes: structuredClone(instance.keyframes),
            colorKeyframes: structuredClone(instance.colorKeyframes),
          }
        : undefined,
    };
  };

  const restoreItemMutationSnapshot = (
    snapshot: ItemMutationSnapshot,
    object: FabricObject,
  ) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const existingObject = canvas
      .getObjects()
      .find((canvasObject) => canvasObject.customId === snapshot.customId);
    if (!existingObject) {
      canvas.add(object);
    }
    if (snapshot.instance) {
      registerInstance(
        snapshot.customId,
        new AnimatableObject(
          object,
          structuredClone(snapshot.instance.keyframes),
          structuredClone(snapshot.instance.colorKeyframes),
        ),
      );
    }
    if (snapshot.itemRecord) {
      dispatch(
        upsertItemRecord({
          id: snapshot.customId,
          value: {
            name: snapshot.itemRecord.name,
            keyframe: snapshot.itemRecord.keyframe.map((marker) => ({
              ...marker,
            })),
          },
        }),
      );
    }
  };

  const removeItemFromCanvasState = (id: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const existingObject = canvas
      .getObjects()
      .find((canvasObject) => canvasObject.customId === id);
    if (existingObject) {
      canvas.remove(existingObject);
    }
    unregisterInstance(id);
    dispatch(removeItemRecord(id));
    if (
      dispatch(dispatchableSelector((state) => state.editor.selectedId)) === id
    ) {
      dispatch(setSelectedId(null));
    }
    canvas.requestRenderAll();
  };

  const undo = () => {
    const action = pastActionsRef.current.pop();
    if (!action) return;
    isHistoryReplayRef.current = true;
    try {
      action.undo();
      futureActionsRef.current.push(action);
      syncHistoryState();
    } finally {
      isHistoryReplayRef.current = false;
    }
  };

  const redo = () => {
    const action = futureActionsRef.current.pop();
    if (!action) return;
    isHistoryReplayRef.current = true;
    try {
      action.redo();
      pastActionsRef.current.push(action);
      syncHistoryState();
    } finally {
      isHistoryReplayRef.current = false;
    }
  };

  const lastUndoRequestVersionRef = useRef(undoRequestVersion);
  const lastRedoRequestVersionRef = useRef(redoRequestVersion);

  useEffect(() => {
    if (undoRequestVersion === lastUndoRequestVersionRef.current) return;
    lastUndoRequestVersionRef.current = undoRequestVersion;
    undo();
  }, [undoRequestVersion]);

  useEffect(() => {
    if (redoRequestVersion === lastRedoRequestVersionRef.current) return;
    lastRedoRequestVersionRef.current = redoRequestVersion;
    redo();
  }, [redoRequestVersion]);

  useEffect(() => {
    // Capture mask changes as history actions so undo/redo can restore mask state.
    const onMaskHistoryEvent = (event: Event) => {
      if (isHistoryReplayRef.current) return;

      const customEvent = event as CustomEvent<MaskHistoryEventDetail>;
      const { nextSourceId, previousSourceId, targetId } = customEvent.detail;
      if (!targetId || previousSourceId === nextSourceId) return;

      const applyMaskState = (sourceId: string) => {
        const targetInstance = getInstanceById(targetId);
        if (!targetInstance) return;

        const run = async () => {
          // Always clear first so undo/remove-mask deletes any existing proxy object.
          await setMaskSourceForInstance(targetInstance);
          if (sourceId === NONE_MASK_SOURCE_ID) return;

          const sourceInstance = getInstanceById(sourceId);
          if (!sourceInstance || sourceInstance === targetInstance) return;
          await setMaskSourceForInstance(targetInstance, sourceInstance);
        };

        void run();
      };

      pushHistoryAction({
        undo: () => {
          applyMaskState(previousSourceId);
        },
        redo: () => {
          applyMaskState(nextSourceId);
        },
      });
    };

    window.addEventListener(MASK_HISTORY_EVENT_NAME, onMaskHistoryEvent);
    return () => {
      window.removeEventListener(MASK_HISTORY_EVENT_NAME, onMaskHistoryEvent);
    };
  }, [getInstanceById]);

  const bindHost = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        hostElementRef.current = null;
        return;
      }
      if (fabricRef.current) return;
      let isPanning = false;
      let lastPanX = 0;
      let lastPanY = 0;
      const transformActionById = new Map<string, string>();
      const canvasElement = document.createElement("canvas");
      canvasElement.className = "h-full w-full";
      node.replaceChildren(canvasElement);
      hostElementRef.current = node;
      hostCanvasElementRef.current = canvasElement;

      const { height, width } = getHostContainerSize(node);
      const _canvas = new Canvas(canvasElement, {
        width,
        height,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
        selection: true,
        subTargetCheck: true,
      });
      fabricRef.current = _canvas;
      setFabricCanvasInstance(_canvas);

      applyFigmaLikeControls(_canvas);

      _canvas.on("selection:created", (event) => {
        const customId = event.selected?.[0]?.customId ?? null;
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

        const before = preTransformSnapshotByIdRef.current.get(customId);
        preTransformSnapshotByIdRef.current.delete(customId);
        if (!before || !target) return;

        const afterTransform = readTransformSnapshot(target);
        const afterItemRecord = dispatch(
          dispatchableSelector((state) => state.editor.itemsRecord[customId]),
        );
        const afterInstance = instancesRef.current.get(customId);
        if (!afterInstance || !afterItemRecord) return;

        const afterKeyframes = structuredClone(afterInstance.keyframes);
        const afterColorKeyframes = structuredClone(
          afterInstance.colorKeyframes,
        );
        const beforeKeyframes = structuredClone(before.instanceKeyframes);
        const beforeColorKeyframes = structuredClone(
          before.instanceColorKeyframes,
        );
        const beforeItemRecord = before.itemRecord;
        const targetObject = target;

        pushHistoryAction({
          undo: () => {
            targetObject.set(before.transform);
            targetObject.setCoords();
            const instance = instancesRef.current.get(customId);
            if (instance) {
              instance.keyframes = structuredClone(beforeKeyframes);
              instance.colorKeyframes = structuredClone(beforeColorKeyframes);
            }
            if (beforeItemRecord) {
              dispatch(
                upsertItemRecord({
                  id: customId,
                  value: {
                    name: beforeItemRecord.name,
                    keyframe: beforeItemRecord.keyframe.map((marker) => ({
                      ...marker,
                    })),
                  },
                }),
              );
            }
            targetObject.canvas?.requestRenderAll();
          },
          redo: () => {
            targetObject.set(afterTransform);
            targetObject.setCoords();
            const instance = instancesRef.current.get(customId);
            if (instance) {
              instance.keyframes = structuredClone(afterKeyframes);
              instance.colorKeyframes = structuredClone(afterColorKeyframes);
            }
            dispatch(
              upsertItemRecord({
                id: customId,
                value: {
                  name: afterItemRecord.name,
                  keyframe: afterItemRecord.keyframe.map((marker) => ({
                    ...marker,
                  })),
                },
              }),
            );
            targetObject.canvas?.requestRenderAll();
          },
        });
      });

      _canvas.on("before:transform", ({ transform }) => {
        const customId = transform?.target?.customId;
        const action = transform?.action;
        if (!customId || !action) return;
        transformActionById.set(customId, action);
        const target = transform?.target;
        const instance = instancesRef.current.get(customId);
        preTransformSnapshotByIdRef.current.set(customId, {
          transform: readTransformSnapshot(target ?? {}),
          itemRecord: dispatch(
            dispatchableSelector((state) => state.editor.itemsRecord[customId]),
          ),
          instanceKeyframes: structuredClone(instance?.keyframes ?? {}),
          instanceColorKeyframes: structuredClone(
            instance?.colorKeyframes ?? {},
          ),
        });
      });

      _canvas.on("object:added", ({ target }) => {
        if (isHistoryReplayRef.current || !target?.customId) return;
        const customId = target.customId;
        const snapshot = buildItemMutationSnapshot(customId);
        if (!snapshot) return;
        const addedObject = target;

        pushHistoryAction({
          undo: () => {
            removeItemFromCanvasState(customId);
          },
          redo: () => {
            restoreItemMutationSnapshot(snapshot, addedObject);
            dispatch(setSelectedId(customId));
            addedObject.canvas?.requestRenderAll();
          },
        });
      });

      _canvas.on("object:removed", ({ target }) => {
        if (isHistoryReplayRef.current || !target?.customId) return;
        const customId = target.customId;
        const snapshot = buildItemMutationSnapshot(customId);
        if (!snapshot) return;
        const removedObject = target;

        pushHistoryAction({
          undo: () => {
            restoreItemMutationSnapshot(snapshot, removedObject);
            dispatch(setSelectedId(customId));
            removedObject.canvas?.requestRenderAll();
          },
          redo: () => {
            removeItemFromCanvasState(customId);
          },
        });
      });

      _canvas.on("mouse:wheel", (event) => {
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

      _canvas.on("mouse:down", (event) => {
        const pointerEvent = event.e as MouseEvent;
        const shouldStartPan = pointerEvent.altKey || pointerEvent.button === 1;
        if (!shouldStartPan) return;

        isPanning = true;
        lastPanX = pointerEvent.clientX;
        lastPanY = pointerEvent.clientY;
        fabricRef.current!.selection = false;
        fabricRef.current!.defaultCursor = "grabbing";
      });

      _canvas.on("mouse:move", (event) => {
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

      _canvas.on("mouse:up", () => {
        if (!isPanning) return;
        isPanning = false;
        if (!fabricRef.current) return;
        fabricRef.current.selection = true;
        fabricRef.current.defaultCursor = "default";
      });

      _canvas.on("mouse:over", (event) => {
        const nextHovered = event.target ?? null;
        if (hoveredObjectRef.current === nextHovered) return;
        hoveredObjectRef.current = nextHovered;
        fabricRef.current?.requestRenderAll();
      });

      _canvas.on("mouse:out", () => {
        if (!hoveredObjectRef.current) return;
        hoveredObjectRef.current = null;
        fabricRef.current?.requestRenderAll();
      });

      _canvas.on("after:render", () => {
        const canvas = fabricRef.current;
        const hoveredObject = hoveredObjectRef.current;
        if (!canvas || !hoveredObject || hoveredObject.canvas !== canvas)
          return;
        if (canvas.getActiveObjects().includes(hoveredObject)) return;

        const context = canvas.getSelectionContext();
        const viewportTransform = canvas.viewportTransform ?? [
          1, 0, 0, 1, 0, 0,
        ];
        const viewportCoords = hoveredObject
          .getCoords()
          .map((point) => util.transformPoint(point, viewportTransform));
        if (viewportCoords.length < 4) return;

        context.save();
        context.strokeStyle = "rgba(56, 189, 248, 0.9)";
        context.lineWidth = 1.25;
        context.setLineDash([6, 4]);
        context.beginPath();
        context.moveTo(viewportCoords[0].x, viewportCoords[0].y);
        for (let index = 1; index < viewportCoords.length; index += 1) {
          const point = viewportCoords[index];
          context.lineTo(point.x, point.y);
        }
        context.closePath();
        context.stroke();
        context.restore();
      });

      const resizeObserver = new ResizeObserver(() => {
        const canvas = fabricRef.current;
        const host = hostElementRef.current;
        if (!canvas || !host) return;
        syncCanvasSizeToContainer(canvas, host);
      });
      resizeObserver.observe(node);
      resizeObserverRef.current = resizeObserver;
    },
    [dispatch, getInstanceById, setFabricCanvasInstance],
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

    const update = () => {
      instancesRef.current.forEach((instance) => {
        instance.seek(playheadTime);
        syncMaskProxyForObject(instance.fabricObject);
      });
      canvas.requestRenderAll();
    };
    update();

    window.addEventListener(AI_STEP_COMPLETE_EVENT, update as EventListener);
    return () => {
      window.removeEventListener(
        AI_STEP_COMPLETE_EVENT,
        update as EventListener,
      );
    };
  }, [instancesRef, playheadTime]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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

      const isUndoShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === "z";
      const isRedoShortcut =
        (event.metaKey || event.ctrlKey) &&
        (event.key.toLowerCase() === "y" ||
          (event.shiftKey && event.key.toLowerCase() === "z"));
      if (isUndoShortcut) {
        event.preventDefault();
        dispatch(requestUndo());
        return;
      }
      if (isRedoShortcut) {
        event.preventDefault();
        dispatch(requestRedo());
        return;
      }

      const isDeleteKey = event.key === "Delete" || event.key === "Backspace";
      if (!isDeleteKey) return;

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
    if (!fabricRef.current) return;
    // const f = initAligningGuidelines(fabricRef.current, {
    //   color: "rgb(56 189 248)",
    // });

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      fabricRef.current?.dispose();
      fabricRef.current = null;
      setFabricCanvasInstance(null);
      if (
        hostElementRef.current &&
        hostCanvasElementRef.current &&
        hostCanvasElementRef.current.parentElement === hostElementRef.current
      ) {
        hostElementRef.current.removeChild(hostCanvasElementRef.current);
      }
      hostCanvasElementRef.current = null;
      hostElementRef.current = null;
      clearInstances();
    };
  }, [clearInstances, setFabricCanvasInstance]);

  return { bindHost, fabricCanvas: fabricRef };
}

export default useFabricEditor;
