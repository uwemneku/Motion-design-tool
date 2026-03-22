/** Canvas App Context.Tsx module implementation. */
import { Canvas, Path, Point } from "fabric";
import { AligningGuidelines } from "fabric/extensions";
import {
  useCallback,
  useEffect,
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
  syncCanvasSizeToContainer,
} from "../hooks/util";
import {
  applyFigmaLikeControls,
  refreshObjectControls,
  syncObjectControlBorderScale,
} from "../util/fabric-controls";
import { setProjectInfo, setSelectedId, upsertItemRecord } from "../../../store/editor-slice";
import { dispatchableSelector, useAppDispatch } from "../../../store";
import {
  CANVAS_KEYFRAME_EPSILON,
  INITIAL_CANVAS_ZOOM,
  CANVAS_ZOOM_SENSITIVITY,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
} from "../../../../const";
import type { FabricObject, Group } from "fabric";

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

type SelectableCanvasObject = FabricObject & {
  customId?: string;
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
      const transformStartAngleById = new Map<string, number>();
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
      _canvas.zoomToPoint(new Point(width / 2, height / 2.5), INITIAL_CANVAS_ZOOM);
      syncObjectControlBorderScale(_canvas);
      dispatch(setProjectInfo({ canvasZoom: INITIAL_CANVAS_ZOOM }));
      const stageContainer = node.parentElement;

      if (stageContainer) {
        /** Keeps Fabric's internal canvas dimensions aligned with the visible stage size. */
        const syncStageSize = () => {
          syncCanvasSizeToContainer(_canvas, stageContainer as HTMLDivElement);
        };

        const resizeObserver = new ResizeObserver(() => {
          syncStageSize();
        });
        resizeObserver.observe(stageContainer);
        syncStageSize();
      }

      applyFigmaLikeControls(_canvas);
      _canvas.add(hoverOutlineRect);

      /** Keeps path point-edit mode isolated to a single double-clicked path at a time. */
      const setActivePathEditingObject = (targetPath: Path | null) => {
        _canvas.getObjects().forEach((object) => {
          if (!(object instanceof Path)) return;
          const shouldEdit = object === targetPath;
          if (object.isPathEditing === shouldEdit) return;
          object.isPathEditing = shouldEdit;
          object.set({
            activePathAnchorCommandIndex: null,
            isPathEditing: shouldEdit,
          });
          refreshObjectControls(object);
          object.canvas?.requestRenderAll();
        });
      };

      _canvas.on("selection:created", (event) => {
        const activeSelection = _canvas.getActiveObject();
        if (activeSelection) {
          refreshObjectControls(activeSelection);
        }
        const selectedIds = getSelectedObjectIds(event.selected ?? []);

        if (selectedIds.length > 0) {
          hoverOutlineRect.set({ visible: false });
        }
        const selectedPath =
          event.selected?.length === 1 && event.selected[0] instanceof Path
            ? (event.selected[0] as Path)
            : null;
        if (!selectedPath?.isPathEditing) {
          setActivePathEditingObject(null);
        }
        dispatch(setSelectedId(selectedIds));
      });

      _canvas.on("selection:updated", (event) => {
        const activeSelection = _canvas.getActiveObject();
        if (activeSelection) {
          refreshObjectControls(activeSelection);
        }
        const selectedPath =
          event.selected?.length === 1 && event.selected[0] instanceof Path
            ? (event.selected[0] as Path)
            : null;
        if (!selectedPath?.isPathEditing) {
          setActivePathEditingObject(null);
        }
        dispatch(setSelectedId(getSelectedObjectIds(event.selected ?? [])));
      });

      _canvas.on("selection:cleared", () => {
        setActivePathEditingObject(null);
        dispatch(setSelectedId([]));
      });

      _canvas.on("object:modified", ({ target }) => {
        const selectedIds = dispatch(dispatchableSelector((state) => state.editor.selectedId));
        const targetIds = getTransformTargetIds(target);
        const modifiedIds =
          targetIds.length > 0
            ? targetIds
            : transformActionById.size > 0
              ? Array.from(transformActionById.keys())
              : selectedIds;

        if (modifiedIds.length === 0) return;

        const timestamp = dispatch(dispatchableSelector((state) => state.editor.playHeadTime));

        modifiedIds.forEach((customId: string) => {
          const instance = getInstanceById(customId);
          if (!instance) return;

          const isPathEditing =
            instance.fabricObject instanceof Path && instance.fabricObject.isPathEditing;
          const snapshot = instance.getSnapshot();
          const action = transformActionById.get(customId);
          const changedProperties = isPathEditing ? [] : getPropertiesForTransformAction(action);
          let wroteAnyKeyframe = false;

          changedProperties.forEach((property) => {
            const propertyValue =
              property === "angle" && action === "rotate"
                ? unwrapRotationAngle(snapshot.angle, transformStartAngleById.get(customId))
                : snapshot[property];
            instance.addKeyframe({
              property,
              value: propertyValue,
              time: timestamp,
              easing: "linear",
            });
            wroteAnyKeyframe = true;
          });

          if (
            instance.fabricObject instanceof Path &&
            instance.fabricObject.isPathEditing &&
            instance.upsertPathSnapshotKeyframe(timestamp, instance.getPathSnapshot())
          ) {
            wroteAnyKeyframe = true;
          }
          transformActionById.delete(customId);
          transformStartAngleById.delete(customId);

          if (!wroteAnyKeyframe) return;

          const existing = dispatch(
            dispatchableSelector((state) => state.editor.itemsRecord[customId]),
          );
          if (!existing) return;

          const hasAtTimestamp = existing.keyframe.some(
            (keyframe) => Math.abs(keyframe.timestamp - timestamp) <= CANVAS_KEYFRAME_EPSILON,
          );
          const nextKeyframes = hasAtTimestamp
            ? existing.keyframe
            : [...existing.keyframe, { id: createKeyframeMarkerId(), timestamp }].sort(
                (a, b) => a.timestamp - b.timestamp,
              );

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
      });
      // FabricObject<Partial<FabricObjectProps>, SerializedObjectProps, ObjectEvents>[]
      _canvas.on("before:transform", ({ transform }) => {
        const action = transform?.action;
        if (!action) return;
        const _object = (transform?.target as Group)?._objects || [transform?.target];
        _object.forEach((object) => {
          const customId = object.get("customId");
          if (!customId || typeof customId !== "string") return;
          transformActionById.set(customId, action);
          if (action === "rotate") {
            transformStartAngleById.set(customId, Number(object.angle ?? 0));
          }
        });
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
          _canvas.relativePan(new Point(-wheelEvent.deltaX, -wheelEvent.deltaY));
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

      _canvas.on("mouse:dblclick", (event) => {
        const target = event.target;
        if (!(target instanceof Path)) {
          setActivePathEditingObject(null);
          return;
        }

        setActivePathEditingObject(target);
        _canvas.setActiveObject(target);
        dispatch(setSelectedId(target.customId ? [target.customId] : []));
        _canvas.requestRenderAll();
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

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const disconnect = new AligningGuidelines(canvas, {});
    return () => {
      disconnect.dispose();
    };
  }, []);
  return <CanvasAppContext.Provider value={value}>{children}</CanvasAppContext.Provider>;
}

/** Extracts stable custom ids from the current Fabric selection payload. */
function getSelectedObjectIds(
  objects: SelectableCanvasObject[],
) {
  const nestedObjects = objects?.[0]?.group?._objects;
  const _objects = nestedObjects || objects;

  return _objects
    .filter((object) => object.selectable !== false && object.evented !== false)
    .map((object) => object.customId || object.get("customId"))
    .filter((customId): customId is string => typeof customId === "string");
}

/** Resolves the concrete object ids touched by a Fabric transform target or active selection. */
function getTransformTargetIds(target: SelectableCanvasObject | undefined) {
  if (!target) return [];

  const nestedObjects = isSelectionContainer(target) ? target._objects : undefined;
  const resolvedObjects = nestedObjects && nestedObjects.length > 0 ? nestedObjects : [target];

  return resolvedObjects
    .map((object: SelectableCanvasObject) => object.customId || object.get("customId"))
    .filter((customId): customId is string => typeof customId === "string");
}

/** Narrows Fabric selection containers that expose child objects through `_objects`. */
function isSelectionContainer(
  target: SelectableCanvasObject,
): target is SelectableCanvasObject & { _objects: SelectableCanvasObject[] } {
  return Array.isArray((target as { _objects?: unknown })._objects);
}

/** Keeps rotation keyframes continuous so anticlockwise drags stay negative when appropriate. */
function unwrapRotationAngle(nextAngle: number, previousAngle?: number) {
  if (previousAngle === undefined || !Number.isFinite(previousAngle)) return nextAngle;
  const safePreviousAngle = previousAngle;
  const delta = ((((nextAngle - safePreviousAngle) % 360) + 540) % 360) - 180;
  return safePreviousAngle + delta;
}
