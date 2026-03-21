/** Use Canvas Items.Ts hook logic. */
import {
  ActiveSelection,
  Group,
  loadSVGFromString,
  Point,
  type Canvas,
  type FabricObject,
} from "fabric";
import type { MutableRefObject } from "react";
import { toast } from "sonner";
import { loadVideoElement } from "../util/video-import";
import { AnimatableObject } from "../../shapes/animatable-object/object";
import type { KeyframeEasing } from "../../shapes/animatable-object/types";
import { setObjectAnimationPosition } from "../../shapes/animatable-object/util";
import { getVideoWorkAreaRect } from "../../export/video-work-area";
import {
  removeItemRecord,
  setCanvasItemIds,
  setSelectedId,
  upsertItemRecord,
} from "../../../store/editor-slice";
import { dispatchableSelector, useAppDispatch, useAppSelector } from "../../../store";
import {
  CircleObject,
  ImageObject,
  LineObject,
  PathObject,
  PolygonObject,
  RectangleObject,
  TextObject,
  VideoObject,
} from "../../shapes/objects";

import { useCanvasAppContext } from "./use-canvas-app-context";
import { createRegularPolygonPoints, validateImageUrl } from "./util";
import { createUniqueId, createKeyframeMarkerId } from "../util/animations-utils";
import { CANVAS_KEYFRAME_EPSILON } from "../../../../const";

type UseCanvasItemsParams = {
  fabricCanvas: MutableRefObject<Canvas | null>;
};
type AddItemOptions = {
  height?: number;
  left?: number;
  radius?: number;
  right?: number;
  top?: number;
  width?: number;
  keyframes?: CanvasItemKeyframeInput[];
  color?: string;
  sides?: number;
  customId?: string;
  markers?: Array<{ id: string; timestamp: number }>;
  name?: string;
  skipInitialSnapshot?: boolean;
  shouldSetSelected?: boolean;
};

type CanvasItemKeyframeInput = {
  angle?: number;
  easing?: KeyframeEasing;
  fill?: string;
  height?: number;
  left?: number;
  opacity?: number;
  stroke?: string;
  time: number;
  top?: number;
  width?: number;
};

type UpdateItemProps = {
  angle?: number;
  fill?: string;
  height?: number;
  left?: number;
  opacity?: number;
  stroke?: string;
  text?: string;
  top?: number;
  width?: number;
};

type CanvasClipboardEntry = {
  instance: AnimatableObject;
  itemName: string;
  timelineMarkers: Array<{ id: string; timestamp: number }>;
};

const PASTE_OFFSET = 24;
let canvasClipboardEntries: CanvasClipboardEntry[] = [];
let canvasClipboardEntriesPromise: Promise<Array<CanvasClipboardEntry | null>> | null = null;

const CANVAS_ITEM_NUMERIC_KEYFRAME_FIELDS = [
  "left",
  "top",
  "width",
  "height",
  "opacity",
  "angle",
] as const;

const CANVAS_ITEM_COLOR_KEYFRAME_FIELDS = ["fill", "stroke"] as const;
const DEFAULT_PATH_DATA = "M 0 56 C 18 8 52 8 70 56 S 122 104 140 56";

function isSvgFile(file: File) {
  // Detect SVG uploads by MIME type or extension so we can parse vector data.
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

function isVideoFile(file: File) {
  // Detect video uploads before passing them into the Fabric video path.
  return file.type.startsWith("video/");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected file."));
        return;
      }
      resolve(reader.result);
    });

    reader.addEventListener("error", () => {
      reject(new Error("Could not read the selected file."));
    });

    reader.readAsDataURL(file);
  });
}

/** Wraps a clipboard blob as a named file so media import can reuse file-based paths. */
function createClipboardImageFile(blob: Blob) {
  const extension = blob.type.split("/")[1] || "png";
  return new File([blob], `clipboard-image.${extension}`, {
    type: blob.type || "image/png",
  });
}

function getBoundsForObjects(objects: FabricObject[]) {
  // Measure a combined bounding rectangle for all parsed SVG objects.
  let minLeft = Number.POSITIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;

  objects.forEach((object) => {
    object.setCoords();
    const rect = object.getBoundingRect();
    minLeft = Math.min(minLeft, rect.left);
    minTop = Math.min(minTop, rect.top);
    maxRight = Math.max(maxRight, rect.left + rect.width);
    maxBottom = Math.max(maxBottom, rect.top + rect.height);
  });

  if (
    !Number.isFinite(minLeft) ||
    !Number.isFinite(minTop) ||
    !Number.isFinite(maxRight) ||
    !Number.isFinite(maxBottom)
  ) {
    return null;
  }

  return {
    left: minLeft,
    top: minTop,
    width: Math.max(1, maxRight - minLeft),
    height: Math.max(1, maxBottom - minTop),
  };
}

function fitSvgObjectsToCanvas(
  objects: FabricObject[],
  canvas: Canvas,
  maxWidthRatio = 0.6,
  maxHeightRatio = 0.6,
) {
  // Scale and center all SVG layers while preserving their relative layout.
  const bounds = getBoundsForObjects(objects);
  if (!bounds) return;

  const maxWidth = canvas.getWidth() * maxWidthRatio;
  const maxHeight = canvas.getHeight() * maxHeightRatio;
  const widthScale = maxWidth / bounds.width;
  const heightScale = maxHeight / bounds.height;
  const scale = Math.min(1, widthScale, heightScale);
  const targetLeft = (canvas.getWidth() - bounds.width * scale) / 2;
  const targetTop = (canvas.getHeight() - bounds.height * scale) / 2;

  objects.forEach((object) => {
    const center = object.getCenterPoint();
    const nextCenterX = (center.x - bounds.left) * scale + targetLeft;
    const nextCenterY = (center.y - bounds.top) * scale + targetTop;
    object.set({
      scaleX: (object.scaleX ?? 1) * scale,
      scaleY: (object.scaleY ?? 1) * scale,
    });
    object.setPositionByOrigin(new Point(nextCenterX, nextCenterY), "center", "center");
    object.setCoords();
  });
}

function getSvgLayerName(object: FabricObject, index: number) {
  // Generate stable readable names for imported SVG layers in timeline/object list.
  const typeName = object.type ? String(object.type).toLowerCase() : "layer";
  return `svg-${typeName}-${index + 1}`;
}

function applyStrokeUniformRecursively(object: FabricObject) {
  // Keep stroke width visually consistent when imported SVG elements are scaled.
  object.set("strokeUniform", true);
  if ("forEachObject" in object && typeof object.forEachObject === "function") {
    object.forEachObject((child: FabricObject) => {
      applyStrokeUniformRecursively(child);
    });
  }
}

function fitVisualMediaToCanvas(
  object: FabricObject,
  canvas: Canvas,
  maxWidthRatio = 0.4,
  maxHeightRatio = 0.8,
) {
  // Scale images and videos into the work area with the same placement rules.
  const mediaWidth = object.width ?? 1;
  const mediaHeight = object.height ?? 1;
  const maxWidth = canvas.getWidth() * maxWidthRatio;
  const maxHeight = canvas.getHeight() * maxHeightRatio;
  const widthScale = maxWidth / mediaWidth;
  const heightScale = maxHeight / mediaHeight;
  const scale = Math.min(1, widthScale, heightScale);

  object.set({
    scaleX: scale,
    scaleY: scale,
  });
}

/** Clones timeline markers while generating fresh marker ids for the pasted object. */
function cloneTimelineMarkers(markers: Array<{ id: string; timestamp: number }>) {
  return markers.map((marker) => ({
    ...marker,
    id: createKeyframeMarkerId(),
  }));
}

export function useCanvasItems({ fabricCanvas }: UseCanvasItemsParams) {
  const dispatch = useAppDispatch();
  const {
    getObjectById: getInstanceById,
    addCanvasObject: registerInstance,
    deleteCanvasObject: unregisterInstance,
  } = useCanvasAppContext();
  const activeAspectRatio =
    useAppSelector((state) => state.editor.projectInfo.videoAspectRatio) ?? 1;

  const getVideoCenter = (canvas: Canvas) => {
    const videoArea = getVideoWorkAreaRect(
      canvas.getWidth(),
      canvas.getHeight(),
      activeAspectRatio,
    );
    return {
      left: videoArea.left + videoArea.width / 2,
      top: videoArea.top + videoArea.height / 2,
    };
  };

  const addObjectToCanvas = (
    instance: AnimatableObject,
    typeName: string,
    options: AddItemOptions = {},
  ) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return null;
    const playheadTime = dispatch(dispatchableSelector((state) => state.editor.playHeadTime));

    const customId = options.customId ?? createUniqueId(typeName);
    const object: FabricObject = instance.fabricObject;
    const hasLeft = typeof options.left === "number" && Number.isFinite(options.left);
    const hasRight = typeof options.right === "number" && Number.isFinite(options.right);
    const hasTop = typeof options.top === "number" && Number.isFinite(options.top);
    const hasWidth = typeof options.width === "number" && Number.isFinite(options.width);
    const hasHeight = typeof options.height === "number" && Number.isFinite(options.height);

    if (hasLeft || hasRight || hasTop) {
      const objectHalfWidth = object.getScaledWidth() / 2;
      const nextLeft = hasLeft
        ? Number(options.left)
        : hasRight
          ? canvas.getWidth() - Number(options.right) - objectHalfWidth
          : (object.left ?? 0);
      const nextTop = hasTop ? Number(options.top) : (object.top ?? 0);
      object.set({
        left: nextLeft,
        top: nextTop,
      });
      object.setCoords();
    }

    if (hasWidth || hasHeight) {
      const currentScaleX = object.scaleX ?? 1;
      const currentScaleY = object.scaleY ?? 1;
      const currentScaledWidth = object.getScaledWidth();
      const currentScaledHeight = object.getScaledHeight();
      const nextScaleX =
        hasWidth && currentScaledWidth > 0
          ? currentScaleX * (Number(options.width) / currentScaledWidth)
          : currentScaleX;
      const nextScaleY =
        hasHeight && currentScaledHeight > 0
          ? currentScaleY * (Number(options.height) / currentScaledHeight)
          : currentScaleY;

      object.set({
        scaleX: nextScaleX,
        scaleY: nextScaleY,
      });
      object.setCoords();
    }

    object.customId = customId;
    object.set("customId", customId);
    object.set("layerName", options.name ?? typeName);
    registerInstance(customId, instance);
    if (!options.skipInitialSnapshot) {
      instance.addSnapshotKeyframe(playheadTime, instance.getSnapshot());
    }

    const timelineMarkers = [...(options.markers ?? [])];
    const hasPlayheadMarker = timelineMarkers.some(
      (marker) => Math.abs(marker.timestamp - playheadTime) <= CANVAS_KEYFRAME_EPSILON,
    );
    if (!hasPlayheadMarker) {
      timelineMarkers.push({
        id: createKeyframeMarkerId(),
        timestamp: playheadTime,
      });
    }
    for (const keyframe of options.keyframes ?? []) {
      if (!Number.isFinite(keyframe.time)) continue;
      CANVAS_ITEM_NUMERIC_KEYFRAME_FIELDS.forEach((property) => {
        const value = keyframe[property];
        if (typeof value !== "number") return;

        instance.addKeyframe({
          property,
          value,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      });
      CANVAS_ITEM_COLOR_KEYFRAME_FIELDS.forEach((property) => {
        const value = keyframe[property];
        if (typeof value !== "string" || value.length === 0) return;

        instance.addColorKeyframe({
          property,
          value,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      });

      const hasMarker = timelineMarkers.some(
        (marker) => Math.abs(marker.timestamp - keyframe.time) <= CANVAS_KEYFRAME_EPSILON,
      );
      if (!hasMarker) {
        timelineMarkers.push({
          id: createKeyframeMarkerId(),
          timestamp: keyframe.time,
        });
      }
    }

    const shouldSetSelected = options.shouldSetSelected ?? true;
    canvas.add(object);
    if (shouldSetSelected) {
      canvas.setActiveObject(object);
    } else if (canvas.getActiveObject() === object) {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();

    dispatch(
      upsertItemRecord({
        id: customId,
        value: {
          isLocked: false,
          name: options.name ?? typeName,
          keyframe: timelineMarkers.sort((a, b) => a.timestamp - b.timestamp),
        },
      }),
    );
    if (shouldSetSelected) {
      dispatch(setSelectedId([customId]));
    }

    console.log("has added items");

    return customId;
  };

  const removeItemById = (id: string) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const targetObject = canvas.getObjects().find((object) => object.customId === id);
    if (!targetObject) return;

    canvas.remove(targetObject);
    unregisterInstance(id);
    dispatch(removeItemRecord(id));
    canvas.requestRenderAll();
  };

  /** Copies the current selection into an internal canvas clipboard. */
  const copySelectedItems = async () => {
    const selectedIds = dispatch(dispatchableSelector((state) => state.editor.selectedId));
    const itemRecords = dispatch(dispatchableSelector((state) => state.editor.itemsRecord));
    if (selectedIds.length === 0) return false;

    canvasClipboardEntriesPromise = Promise.all(
      selectedIds.map(async (id) => {
        const instance = getInstanceById(id);
        const itemRecord = itemRecords[id];
        if (!instance || !itemRecord) return null;

        return {
          instance: await instance.clone(),
          itemName: itemRecord.name,
          timelineMarkers: cloneTimelineMarkers(itemRecord.keyframe),
        } satisfies CanvasClipboardEntry;
      }),
    );

    const nextClipboardEntries = await canvasClipboardEntriesPromise;
    canvasClipboardEntries = nextClipboardEntries.filter(
      (entry): entry is CanvasClipboardEntry => entry !== null,
    );
    canvasClipboardEntriesPromise = null;

    return canvasClipboardEntries.length > 0;
  };

  /** Pastes the internal canvas clipboard as new objects with fresh ids and markers. */
  const pasteCopiedItems = async () => {
    const canvas = fabricCanvas.current;
    if (!canvas) return [];

    if (canvasClipboardEntriesPromise) {
      const nextClipboardEntries = await canvasClipboardEntriesPromise;
      canvasClipboardEntries = nextClipboardEntries.filter(
        (entry): entry is CanvasClipboardEntry => entry !== null,
      );
      canvasClipboardEntriesPromise = null;
    }

    if (canvasClipboardEntries.length === 0) return [];

    const pastedIds = await Promise.all(
      canvasClipboardEntries.map(async (clipboardEntry, index) => {
        const clonedInstance = await clipboardEntry.instance.clone({
          left: PASTE_OFFSET,
          top: PASTE_OFFSET,
        });

        const pastedId = addObjectToCanvas(
          clonedInstance,
          clonedInstance.fabricObject.type ?? "item",
          {
            markers: cloneTimelineMarkers(clipboardEntry.timelineMarkers),
            name:
              canvasClipboardEntries.length === 1
                ? `${clipboardEntry.itemName} copy`
                : `${clipboardEntry.itemName} copy ${index + 1}`,
            shouldSetSelected: false,
            skipInitialSnapshot: true,
          },
        );

        return pastedId;
      }),
    );

    const nextSelectedIds = pastedIds.filter((id): id is string => typeof id === "string");
    if (nextSelectedIds.length > 0) {
      const pastedObjects = nextSelectedIds
        .map((id) => getInstanceById(id)?.fabricObject)
        .filter((object): object is FabricObject => Boolean(object));

      if (pastedObjects.length === 1) {
        canvas.setActiveObject(pastedObjects[0]);
      } else if (pastedObjects.length > 1) {
        canvas.setActiveObject(
          new ActiveSelection(pastedObjects, {
            canvas,
          }),
        );
      }

      dispatch(setSelectedId(nextSelectedIds));
      canvas.requestRenderAll();
    }

    return nextSelectedIds;
  };

  /** Imports the first image currently available from the system clipboard. */
  const pasteImageFromClipboard = async () => {
    if (
      typeof navigator === "undefined" ||
      !("clipboard" in navigator) ||
      typeof navigator.clipboard.read !== "function"
    ) {
      return false;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;

        const imageBlob = await clipboardItem.getType(imageType);
        await addImageFromFile(createClipboardImageFile(imageBlob));
        return true;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not read an image from the clipboard.";
      toast.error(`Clipboard image paste failed: ${message}`);
      return false;
    }

    return false;
  };

  /** Collapses the current Fabric multi-selection into one grouped canvas item. */
  const groupSelectedItems = () => {
    const canvas = fabricCanvas.current;
    if (!canvas) return null;

    const activeObjects = canvas.getActiveObjects().filter((object) => {
      const customId = object.customId ?? object.get("customId");
      return typeof customId === "string";
    });
    if (activeObjects.length < 2) return null;

    const groupedIds = activeObjects
      .map((object) => object.customId ?? object.get("customId"))
      .filter((customId): customId is string => typeof customId === "string");

    const groupedNames = groupedIds.map((id) => {
      const itemRecord = dispatch(dispatchableSelector((state) => state.editor.itemsRecord[id]));
      return itemRecord?.name ?? id;
    });
    const groupedInstances = groupedIds.map((id) => getInstanceById(id));
    const previousCanvasItemIds = dispatch(
      dispatchableSelector((state) => state.editor.canvasItemIds),
    );

    canvas.discardActiveObject();
    activeObjects.forEach((object, index) => {
      object.set("layerName", groupedNames[index] ?? getSvgLayerName(object, index));
    });

    const fabricGroup = new Group(activeObjects, {
      originX: "center",
      originY: "center",
      subTargetCheck: true,
    });
    groupedInstances.forEach((instance) => {
      instance?.rebasePositionKeyframes("toParent");
    });

    const groupId = addObjectToCanvas(new AnimatableObject(fabricGroup), "group", {
      name: `group (${groupedIds.length})`,
      shouldSetSelected: true,
    });
    if (groupId) {
      const groupRecord = dispatch(
        dispatchableSelector((state) => state.editor.itemsRecord[groupId]),
      );
      if (groupRecord) {
        dispatch(
          upsertItemRecord({
            id: groupId,
            value: {
              ...groupRecord,
              childIds: groupedIds,
            },
          }),
        );
      }
      dispatch(
        setCanvasItemIds([
          groupId,
          ...previousCanvasItemIds.filter((canvasItemId) => !groupedIds.includes(canvasItemId)),
        ]),
      );
    }

    canvas.requestRenderAll();
    return groupId;
  };

  const addCircle = (options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const { left, top } = getVideoCenter(canvas);

    const circle = new CircleObject({
      left,
      top,
      originX: "center",
      originY: "center",
      radius:
        typeof options.radius === "number" && Number.isFinite(options.radius)
          ? Math.max(1, options.radius)
          : 70,
      fill: options.color ?? "#ffffff",
      stroke: "#6b7280",
      strokeWidth: 0,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(circle, "circle", options);
  };

  const addPolygon = (options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const { left, top } = getVideoCenter(canvas);
    const sides = Math.max(3, Math.round(options.sides ?? 5));
    const polygon = new PolygonObject(createRegularPolygonPoints(sides, 70), {
      left,
      top,
      originX: "center",
      originY: "center",
      fill: options.color ?? "#ffffff",
      stroke: "#4b5563",
      strokeWidth: 0,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(polygon, "polygon", options);
  };

  const addLine = (options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const { left, top } = getVideoCenter(canvas);
    const line = new LineObject([0, 0, 180, 0], {
      left,
      top,
      originX: "center",
      originY: "center",
      stroke: options.color ?? "#ffffff",
      strokeWidth: 2,
      strokeLineCap: "round",
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(line, "line", options);
  };

  const addPath = (options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const { left, top } = getVideoCenter(canvas);
    const path = new PathObject(DEFAULT_PATH_DATA, {
      left,
      top,
      originX: "center",
      originY: "center",
      fill: "",
      stroke: options.color ?? "#ffffff",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      strokeWidth: 3,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(path, "path", options);
  };

  /** Adds a new open path by connecting user-placed canvas points in sequence. */
  const addPathFromPoints = (points: Point[], options: AddItemOptions = {}) => {
    if (points.length < 2) return null;

    const pathData = points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${Number(point.x.toFixed(2))} ${Number(point.y.toFixed(2))}`,
      )
      .join(" ");
    const path = new PathObject(pathData, {
      fill: "",
      originX: "center",
      originY: "center",
      stroke: options.color ?? "#ffffff",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      strokeWidth: 3,
      strokeUniform: true,
      ...options,
    });

    return addObjectToCanvas(path, "path", options);
  };

  /** Adds a new path directly from SVG path data produced by the pen tool. */
  const addPathFromData = (pathData: string, options: AddItemOptions = {}) => {
    if (!pathData.trim()) return null;

    const path = new PathObject(pathData, {
      fill: "",
      originX: "center",
      originY: "center",
      stroke: options.color ?? "#ffffff",
      strokeLineCap: "round",
      strokeLineJoin: "round",
      strokeWidth: 3,
      strokeUniform: true,
      ...options,
    });

    return addObjectToCanvas(path, "path", options);
  };

  const addRectangle = (options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const { left, top } = getVideoCenter(canvas);
    const rectangle = new RectangleObject({
      left,
      top,
      originX: "center",
      originY: "center",
      width: 180,
      height: 110,
      fill: options.color ?? "#ffffff",
      stroke: "#4b5563",
      strokeWidth: 0,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(rectangle, "rectangle", options);
  };

  const addImageFromURL = async (url: string, options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const { left, top } = getVideoCenter(canvas);

    await validateImageUrl(url);

    const imageObject = await ImageObject.fromURL(url, {
      crossOrigin: "anonymous",
    });
    fitVisualMediaToCanvas(imageObject.fabricObject, canvas);

    imageObject.fabricObject.set({
      left,
      top,
      originX: "center",
      originY: "center",
      stroke: "#ffffff",
      strokeWidth: 0,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(imageObject, "image", options);
  };

  const addImageFromFile = async (file: File, options: AddItemOptions = {}) => {
    // Import bitmap files through a stable data URL so later clones can recreate the media.
    const fileUrl = await readFileAsDataUrl(file);
    await addImageFromURL(fileUrl, options);
  };

  const addVideoFromFile = async (file: File, options: AddItemOptions = {}) => {
    // Import video files into Fabric through a live HTMLVideoElement.
    if (!isVideoFile(file)) {
      toast.error("Please select a video file.");
      return;
    }

    const canvas = fabricCanvas.current;
    if (!canvas) return;

    try {
      const fileUrl = await readFileAsDataUrl(file);
      const videoElement = await loadVideoElement(fileUrl);
      const { left, top } = getVideoCenter(canvas);
      const videoObject = new VideoObject(videoElement, {
        left,
        top,
        originX: "center",
        originY: "center",
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        objectCaching: false,
        stroke: "#ffffff",
        strokeWidth: 0,
        strokeUniform: true,
        ...options,
      });

      fitVisualMediaToCanvas(videoObject.fabricObject, canvas);
      const defaultVideoName = file.name.replace(/\.[^/.]+$/, "") || "video";
      const objectId = addObjectToCanvas(videoObject, "video", {
        ...options,
        name: options.name ?? defaultVideoName,
      });
      if (!objectId) return;

      videoElement.pause();
      videoElement.currentTime = 0;
      canvas.requestRenderAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load the video.";
      toast.error(`Video import failed: ${message}`);
    }
  };

  const addSvgFromFile = async (file: File, options: AddItemOptions = {}) => {
    // Attempt SVG parsing into editable Fabric objects instead of rasterizing.
    if (!isSvgFile(file)) {
      toast.error("Please select an SVG file.");
      return;
    }

    const canvas = fabricCanvas.current;
    if (!canvas) return;

    try {
      const svgText = await file.text();
      const parsed = await loadSVGFromString(svgText);
      if (parsed.objects.length === 0) {
        throw new Error("No SVG shapes found.");
      }

      const svgObjects = parsed.objects as FabricObject[];
      svgObjects.forEach((object) => {
        applyStrokeUniformRecursively(object);
      });
      fitSvgObjectsToCanvas(svgObjects, canvas);

      svgObjects.forEach((object, index) => {
        addObjectToCanvas(new AnimatableObject(object), "svg", {
          ...options,
          left: options.left,
          right: options.right,
          top: options.top,
          name: getSvgLayerName(object, index),
          shouldSetSelected: index === svgObjects.length - 1,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not parse SVG.";
      toast.error(`SVG import failed: ${message}`);
    }
  };

  const addText = (content = "Edit text", options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const { left, top } = getVideoCenter(canvas);
    const text = new TextObject(content, {
      left,
      top,
      originX: "center",
      originY: "center",
      fontSize: 44,
      fill: options.color ?? "#ffffff",
      fontWeight: 700,
      editable: true,
      ...options,
    });

    addObjectToCanvas(text, "text", options);
  };

  const updateItemById = (
    id: string,
    options: { keyframes?: CanvasItemKeyframeInput[]; props?: UpdateItemProps } = {},
  ) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return false;
    const instance = getInstanceById(id);
    const itemRecord = dispatch(dispatchableSelector((state) => state.editor.itemsRecord[id]));
    if (!instance || !itemRecord) return false;

    const timelineMarkers = [...itemRecord.keyframe];
    const object = instance.fabricObject;
    const playheadTime = dispatch(dispatchableSelector((state) => state.editor.playHeadTime));

    const pushMarkerIfNeeded = (timestamp: number) => {
      const hasMarker = timelineMarkers.some(
        (marker) => Math.abs(marker.timestamp - timestamp) <= CANVAS_KEYFRAME_EPSILON,
      );
      if (hasMarker) return;
      timelineMarkers.push({
        id: createKeyframeMarkerId(),
        timestamp,
      });
    };

    if (options.props) {
      const nextProps = options.props;
      if (typeof nextProps.left === "number") {
        setObjectAnimationPosition(object, "left", nextProps.left);
        instance.addKeyframe({
          property: "left",
          value: nextProps.left,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.top === "number") {
        setObjectAnimationPosition(object, "top", nextProps.top);
        instance.addKeyframe({
          property: "top",
          value: nextProps.top,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.opacity === "number") {
        object.set("opacity", nextProps.opacity);
        instance.addKeyframe({
          property: "opacity",
          value: nextProps.opacity,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.angle === "number") {
        object.set("angle", nextProps.angle);
        instance.addKeyframe({
          property: "angle",
          value: nextProps.angle,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.width === "number") {
        const currentScaleX = object.scaleX ?? 1;
        const currentScaledWidth = object.getScaledWidth();
        if (currentScaledWidth > 0) {
          object.set("scaleX", currentScaleX * (Number(nextProps.width) / currentScaledWidth));
          instance.addKeyframe({
            property: "width",
            value: object.getScaledWidth(),
            time: playheadTime,
            easing: "linear",
          });
        }
      }
      if (typeof nextProps.height === "number") {
        const currentScaleY = object.scaleY ?? 1;
        const currentScaledHeight = object.getScaledHeight();
        if (currentScaledHeight > 0) {
          object.set("scaleY", currentScaleY * (Number(nextProps.height) / currentScaledHeight));
          instance.addKeyframe({
            property: "height",
            value: object.getScaledHeight(),
            time: playheadTime,
            easing: "linear",
          });
        }
      }
      if (typeof nextProps.fill === "string" && nextProps.fill.length > 0) {
        object.set("fill", nextProps.fill);
        instance.addColorKeyframe({
          property: "fill",
          value: nextProps.fill,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.stroke === "string" && nextProps.stroke.length > 0) {
        object.set("stroke", nextProps.stroke);
        instance.addColorKeyframe({
          property: "stroke",
          value: nextProps.stroke,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.text === "string") {
        object.set("text", nextProps.text);
      }

      pushMarkerIfNeeded(playheadTime);
    }

    for (const keyframe of options.keyframes ?? []) {
      if (!Number.isFinite(keyframe.time)) continue;
      if (typeof keyframe.left === "number") {
        instance.addKeyframe({
          property: "left",
          value: keyframe.left,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.top === "number") {
        instance.addKeyframe({
          property: "top",
          value: keyframe.top,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.width === "number") {
        instance.addKeyframe({
          property: "width",
          value: keyframe.width,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.height === "number") {
        instance.addKeyframe({
          property: "height",
          value: keyframe.height,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.opacity === "number") {
        instance.addKeyframe({
          property: "opacity",
          value: keyframe.opacity,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.angle === "number") {
        instance.addKeyframe({
          property: "angle",
          value: keyframe.angle,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.fill === "string" && keyframe.fill.length > 0) {
        instance.addColorKeyframe({
          property: "fill",
          value: keyframe.fill,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.stroke === "string" && keyframe.stroke.length > 0) {
        instance.addColorKeyframe({
          property: "stroke",
          value: keyframe.stroke,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      pushMarkerIfNeeded(keyframe.time);
    }

    object.setCoords();
    canvas.requestRenderAll();
    dispatch(
      upsertItemRecord({
        id,
        value: {
          ...itemRecord,
          keyframe: timelineMarkers.sort((a, b) => a.timestamp - b.timestamp),
        },
      }),
    );
    return true;
  };

  return {
    addCircle,
    addLine,
    addPath,
    addPathFromData,
    addPathFromPoints,
    addPolygon,
    addRectangle,
    addImageFromFile,
    addSvgFromFile,
    addVideoFromFile,
    addImageFromURL,
    copySelectedItems,
    groupSelectedItems,
    pasteImageFromClipboard,
    pasteCopiedItems,
    removeItemById,
    updateItemById,
    addText,
  };
}
