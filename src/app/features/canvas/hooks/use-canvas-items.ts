/** Use Canvas Items.Ts hook logic. */
import {
  loadSVGFromString,
  Point,
  type Canvas,
  type FabricObject,
} from "fabric";
import type { MutableRefObject } from "react";
import { useRef } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { AnimatableObject } from "../../shapes/animatable-object/object";
import {
  removeItemRecord,
  setSelectedId,
  upsertItemRecord,
} from "../../../store/editor-slice";
import { dispatchableSelector, type AppDispatch } from "../../../store";
import {
  CircleObject,
  ImageObject,
  LineObject,
  PolygonObject,
  RectangleObject,
  TextObject,
} from "../../shapes/objects";
import type { AIItemKeyframe } from "../../ai/editor-ai-events";

import { useCanvasAppContext } from "./use-canvas-app-context";
import { createRegularPolygonPoints, validateImageUrl } from "./util";
import {
  createUniqueId,
  createKeyframeMarkerId,
} from "../util/animations-utils";
import {
  CANVAS_KEYFRAME_EPSILON,
  IMAGE_PLACEHOLDER_HEIGHT_RATIO,
  IMAGE_PLACEHOLDER_MIN_SIZE,
  IMAGE_PLACEHOLDER_PULSE_DURATION_MS,
  IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY,
  IMAGE_PLACEHOLDER_PULSE_MIN_OPACITY,
  IMAGE_PLACEHOLDER_WIDTH_RATIO,
} from "../../../../const";

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
  keyframes?: AIItemKeyframe[];
  color?: string;
  sides?: number;
  customId?: string;
  markers?: Array<{ id: string; timestamp: number }>;
  name?: string;
  shouldSetSelected?: boolean;
};

type UpdateItemProps = {
  angle?: number;
  fill?: string;
  left?: number;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
  stroke?: string;
  text?: string;
  top?: number;
  width?: number;
};

function isSvgFile(file: File) {
  // Detect SVG uploads by MIME type or extension so we can parse vector data.
  return (
    file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")
  );
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
    object.setPositionByOrigin(
      new Point(nextCenterX, nextCenterY),
      "center",
      "center",
    );
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

export function useCanvasItems({ fabricCanvas }: UseCanvasItemsParams) {
  const dispatch = useDispatch<AppDispatch>();
  const { getInstanceById, registerInstance, unregisterInstance } =
    useCanvasAppContext();
  const placeholderCleanupByIdRef = useRef<Map<string, () => void>>(new Map());

  const addObjectToCanvas = (
    instance: AnimatableObject,
    typeName: string,
    options: AddItemOptions = {},
  ) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return null;
    const playheadTime = dispatch(
      dispatchableSelector((state) => state.editor.playheadTime),
    );

    const customId = options.customId ?? createUniqueId(typeName);
    const object: FabricObject = instance.fabricObject;
    const hasLeft =
      typeof options.left === "number" && Number.isFinite(options.left);
    const hasRight =
      typeof options.right === "number" && Number.isFinite(options.right);
    const hasTop =
      typeof options.top === "number" && Number.isFinite(options.top);
    const hasWidth =
      typeof options.width === "number" && Number.isFinite(options.width);
    const hasHeight =
      typeof options.height === "number" && Number.isFinite(options.height);

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
    registerInstance(customId, instance);
    instance.addSnapshotKeyframe(playheadTime, instance.getSnapshot());

    const timelineMarkers = [...(options.markers ?? [])];
    const hasPlayheadMarker = timelineMarkers.some(
      (marker) =>
        Math.abs(marker.timestamp - playheadTime) <= CANVAS_KEYFRAME_EPSILON,
    );
    if (!hasPlayheadMarker) {
      timelineMarkers.push({
        id: createKeyframeMarkerId(),
        timestamp: playheadTime,
      });
    }
    const sortedExtraKeyframes = [...(options.keyframes ?? [])].sort(
      (a, b) => a.time - b.time,
    );
    for (const keyframe of sortedExtraKeyframes) {
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
      if (typeof keyframe.scaleX === "number") {
        instance.addKeyframe({
          property: "scaleX",
          value: keyframe.scaleX,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.scaleY === "number") {
        instance.addKeyframe({
          property: "scaleY",
          value: keyframe.scaleY,
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

      const hasMarker = timelineMarkers.some(
        (marker) =>
          Math.abs(marker.timestamp - keyframe.time) <= CANVAS_KEYFRAME_EPSILON,
      );
      if (!hasMarker) {
        timelineMarkers.push({
          id: createKeyframeMarkerId(),
          timestamp: keyframe.time,
        });
      }
    }

    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();

    dispatch(
      upsertItemRecord({
        id: customId,
        value: {
          name: options.name ?? typeName,
          keyframe: timelineMarkers.sort((a, b) => a.timestamp - b.timestamp),
        },
      }),
    );
    if (options.shouldSetSelected ?? true) {
      dispatch(setSelectedId(customId));
    }

    return customId;
  };

  const stopPlaceholderAnimation = (id: string) => {
    const stop = placeholderCleanupByIdRef.current.get(id);
    if (!stop) return;
    stop();
    placeholderCleanupByIdRef.current.delete(id);
  };

  const removeItemById = (id: string) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    stopPlaceholderAnimation(id);
    const targetObject = canvas
      .getObjects()
      .find((object) => object.customId === id);
    if (!targetObject) return;

    canvas.remove(targetObject);
    unregisterInstance(id);
    dispatch(removeItemRecord(id));
    canvas.requestRenderAll();
  };

  const startPlaceholderPulse = (id: string) => {
    const instance = getInstanceById(id);
    const canvas = fabricCanvas.current;
    if (!instance || !canvas) return;

    let stopped = false;
    const run = (nextOpacity: number) => {
      if (stopped) return;
      instance.fabricObject.animate(
        { opacity: nextOpacity },
        {
          duration: IMAGE_PLACEHOLDER_PULSE_DURATION_MS,
          onChange: () => {
            canvas.requestRenderAll();
          },
          onComplete: () => {
            run(
              nextOpacity === IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY
                ? IMAGE_PLACEHOLDER_PULSE_MIN_OPACITY
                : IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY,
            );
          },
        },
      );
    };

    run(IMAGE_PLACEHOLDER_PULSE_MIN_OPACITY);
    placeholderCleanupByIdRef.current.set(id, () => {
      stopped = true;
      instance.fabricObject.set("opacity", 1);
      canvas.requestRenderAll();
    });
  };

  const addImagePlaceholder = (options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return null;

    const width = Math.max(
      IMAGE_PLACEHOLDER_MIN_SIZE,
      canvas.getWidth() * IMAGE_PLACEHOLDER_WIDTH_RATIO,
    );
    const height = Math.max(
      IMAGE_PLACEHOLDER_MIN_SIZE * 0.66,
      canvas.getHeight() * IMAGE_PLACEHOLDER_HEIGHT_RATIO,
    );
    const left = (canvas.getWidth() - width) / 2;
    const top = (canvas.getHeight() - height) / 2;

    const placeholder = new RectangleObject({
      left,
      top,
      width,
      height,
      fill: "#38bdf833",
      stroke: "#38bdf8",
      strokeWidth: 0,
      strokeDashArray: [10, 6],
      rx: 10,
      ry: 10,
      opacity: IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY,
      strokeUniform: true,
    });

    const id = addObjectToCanvas(placeholder, "image", {
      ...options,
      customId: createUniqueId("image-placeholder"),
      name: "image-loading",
      shouldSetSelected: false,
    });
    if (!id) return null;
    startPlaceholderPulse(id);
    return id;
  };

  const replaceItemWithImageFromURL = async (
    id: string,
    url: string,
    options: AddItemOptions = {},
  ) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const targetObject = canvas
      .getObjects()
      .find((object) => object.customId === id);
    const existingItem = dispatch(
      dispatchableSelector((state) => state.editor.itemsRecord[id]),
    );
    const wasSelected =
      dispatch(dispatchableSelector((state) => state.editor.selectedId)) === id;
    const placement = targetObject
      ? {
          left: targetObject.left ?? 0,
          top: targetObject.top ?? 0,
          width: Math.max(1, targetObject.getScaledWidth()),
          height: Math.max(1, targetObject.getScaledHeight()),
        }
      : null;

    await validateImageUrl(url);
    const imageObject = await ImageObject.fromURL(url, {
      crossOrigin: "anonymous",
    });

    const imageWidth = imageObject.fabricObject.width ?? 1;
    const imageHeight = imageObject.fabricObject.height ?? 1;
    const maxWidth = placement?.width ?? canvas.getWidth() * 0.4;
    const maxHeight = placement?.height ?? canvas.getHeight() * 0.8;
    const widthScale = maxWidth / imageWidth;
    const heightScale = maxHeight / imageHeight;
    const scale = Math.min(1, widthScale, heightScale);

    imageObject.fabricObject.set({
      left: placement?.left ?? 520,
      top: placement?.top ?? 220,
      scaleX: scale,
      scaleY: scale,
    });

    if (targetObject) {
      canvas.remove(targetObject);
    }
    stopPlaceholderAnimation(id);
    unregisterInstance(id);

    addObjectToCanvas(imageObject, "image", {
      ...options,
      customId: id,
      markers: existingItem?.keyframe,
      shouldSetSelected: wasSelected,
    });
  };

  const addCircle = (options: AddItemOptions = {}) => {
    const circle = new CircleObject({
      left: 0,
      top: 0,
      radius:
        typeof options.radius === "number" && Number.isFinite(options.radius)
          ? Math.max(1, options.radius)
          : 70,
      fill: options.color ?? "#ffffff",
      stroke: "#7f1d1d",
      strokeWidth: 0,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(circle, "circle", options);
  };

  const addPolygon = (options: AddItemOptions = {}) => {
    const sides = Math.max(3, Math.round(options.sides ?? 5));
    const polygon = new PolygonObject(createRegularPolygonPoints(sides, 70), {
      left: 360,
      top: 140,
      fill: options.color ?? "#ffffff",
      stroke: "#312e81",
      strokeWidth: 0,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(polygon, "polygon", options);
  };

  const addLine = (options: AddItemOptions = {}) => {
    const line = new LineObject([0, 0, 180, 0], {
      left: 220,
      top: 180,
      stroke: options.color ?? "#ffffff",
      strokeWidth: 2,
      strokeLineCap: "round",
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(line, "line", options);
  };

  const addRectangle = (options: AddItemOptions = {}) => {
    const rectangle = new RectangleObject({
      left: 380,
      top: 180,
      width: 180,
      height: 110,
      fill: options.color ?? "#ffffff",
      stroke: "#14532d",
      strokeWidth: 0,
      strokeUniform: true,
      ...options,
    });

    addObjectToCanvas(rectangle, "rectangle", options);
  };

  const addImageFromURL = async (url: string, options: AddItemOptions = {}) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    await validateImageUrl(url);

    const imageObject = await ImageObject.fromURL(url, {
      crossOrigin: "anonymous",
    });
    const imageWidth = imageObject.fabricObject.width ?? 1;
    const imageHeight = imageObject.fabricObject.height ?? 1;
    const maxWidth = canvas.getWidth() * 0.4;
    const maxHeight = canvas.getHeight() * 0.8;
    const widthScale = maxWidth / imageWidth;
    const heightScale = maxHeight / imageHeight;
    const scale = Math.min(1, widthScale, heightScale);

    imageObject.fabricObject.set({
      left: 520,
      top: 220,
      scaleX: scale,
      scaleY: scale,
      ...options,
    });

    addObjectToCanvas(imageObject, "image", options);
  };

  const addImageFromFile = async (file: File, options: AddItemOptions = {}) => {
    // Import bitmap files through object URL and revoke URL after load.
    const fileUrl = URL.createObjectURL(file);
    try {
      await addImageFromURL(fileUrl, options);
    } finally {
      URL.revokeObjectURL(fileUrl);
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
      const message =
        error instanceof Error ? error.message : "Could not parse SVG.";
      toast.error(`SVG import failed: ${message}`);
    }
  };

  const addText = (content = "Edit text", options: AddItemOptions = {}) => {
    const text = new TextObject(content, {
      left: 240,
      top: 260,
      width: 260,
      fontSize: 44,
      fill: options.color ?? "#ffffff",
      fontWeight: 700,
      editable: true,
    });

    addObjectToCanvas(text, "text", options);
  };

  const updateItemById = (
    id: string,
    options: { keyframes?: AIItemKeyframe[]; props?: UpdateItemProps } = {},
  ) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return false;
    const instance = getInstanceById(id);
    const itemRecord = dispatch(
      dispatchableSelector((state) => state.editor.itemsRecord[id]),
    );
    if (!instance || !itemRecord) return false;

    const timelineMarkers = [...itemRecord.keyframe];
    const object = instance.fabricObject;
    const playheadTime = dispatch(
      dispatchableSelector((state) => state.editor.playheadTime),
    );

    const pushMarkerIfNeeded = (timestamp: number) => {
      const hasMarker = timelineMarkers.some(
        (marker) =>
          Math.abs(marker.timestamp - timestamp) <= CANVAS_KEYFRAME_EPSILON,
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
        object.set("left", nextProps.left);
        instance.addKeyframe({
          property: "left",
          value: nextProps.left,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.top === "number") {
        object.set("top", nextProps.top);
        instance.addKeyframe({
          property: "top",
          value: nextProps.top,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.scaleX === "number") {
        object.set("scaleX", nextProps.scaleX);
        instance.addKeyframe({
          property: "scaleX",
          value: nextProps.scaleX,
          time: playheadTime,
          easing: "linear",
        });
      }
      if (typeof nextProps.scaleY === "number") {
        object.set("scaleY", nextProps.scaleY);
        instance.addKeyframe({
          property: "scaleY",
          value: nextProps.scaleY,
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
          object.set(
            "scaleX",
            currentScaleX * (Number(nextProps.width) / currentScaledWidth),
          );
          const scaleX = Number(object.scaleX ?? 1);
          instance.addKeyframe({
            property: "scaleX",
            value: scaleX,
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

    const extraKeyframes = [...(options.keyframes ?? [])].sort(
      (a, b) => a.time - b.time,
    );
    for (const keyframe of extraKeyframes) {
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
      if (typeof keyframe.scaleX === "number") {
        instance.addKeyframe({
          property: "scaleX",
          value: keyframe.scaleX,
          time: keyframe.time,
          easing: keyframe.easing ?? "linear",
        });
      }
      if (typeof keyframe.scaleY === "number") {
        instance.addKeyframe({
          property: "scaleY",
          value: keyframe.scaleY,
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
    addPolygon,
    addRectangle,
    addImagePlaceholder,
    addImageFromFile,
    addSvgFromFile,
    addImageFromURL,
    removeItemById,
    updateItemById,
    replaceItemWithImageFromURL,
    addText,
  };
}
