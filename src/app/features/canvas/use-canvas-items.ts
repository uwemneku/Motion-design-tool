import type { Canvas, FabricObject } from "fabric";
import type { MutableRefObject } from "react";
import { useRef } from "react";
import { useDispatch } from "react-redux";
import type { AnimatableObject } from "../shapes/animatable-object/object";
import { useCanvasAppContext } from "./use-canvas-app-context";
import {
  removeItemRecord,
  setSelectedId,
  upsertItemRecord,
} from "../../store/editor-slice";
import { dispatchableSelector, type AppDispatch } from "../../store";
import {
  CircleObject,
  ImageObject,
  LineObject,
  PolygonObject,
  RectangleObject,
  TextObject,
} from "../shapes/objects";
import type { AIItemKeyframe } from "../ai/editor-ai-events";

type UseCanvasItemsParams = {
  fabricCanvas: MutableRefObject<Canvas | null>;
};
type AddItemOptions = {
  keyframes?: AIItemKeyframe[];
  color?: string;
  sides?: number;
  customId?: string;
  markers?: Array<{ id: string; timestamp: number }>;
  name?: string;
  shouldSetSelected?: boolean;
};
const KEYFRAME_EPSILON = 0.001;
const IMAGE_PLACEHOLDER_WIDTH_RATIO = 0.36;
const IMAGE_PLACEHOLDER_HEIGHT_RATIO = 0.32;
const IMAGE_PLACEHOLDER_MIN_SIZE = 140;
const IMAGE_PLACEHOLDER_PULSE_DURATION_MS = 900;
const IMAGE_PLACEHOLDER_PULSE_MIN_OPACITY = 0.34;
const IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY = 0.88;

function createCustomId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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

async function validateImageUrl(url: string) {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Image could not be loaded from the provided URL."));
    image.src = url;
  });
}

function createRegularPolygonPoints(sides: number, radius: number) {
  const safeSides = Math.max(3, Math.round(sides));
  const step = (Math.PI * 2) / safeSides;
  const startAngle = -Math.PI / 2;

  return Array.from({ length: safeSides }, (_, index) => {
    const angle = startAngle + step * index;
    return {
      x: Math.cos(angle) * radius + radius,
      y: Math.sin(angle) * radius + radius,
    };
  });
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

    const customId = options.customId ?? createCustomId(typeName);
    const object: FabricObject = instance.fabricObject;
    object.customId = customId;
    object.set("customId", customId);
    registerInstance(customId, instance);
    instance.addSnapshotKeyframe(playheadTime, instance.getSnapshot());

    const timelineMarkers = [...(options.markers ?? [])];
    const hasPlayheadMarker = timelineMarkers.some(
      (marker) => Math.abs(marker.timestamp - playheadTime) <= KEYFRAME_EPSILON,
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

      const hasMarker = timelineMarkers.some(
        (marker) =>
          Math.abs(marker.timestamp - keyframe.time) <= KEYFRAME_EPSILON,
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
      instance.fabricObject.animate("opacity", nextOpacity, {
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
      });
    };

    run(IMAGE_PLACEHOLDER_PULSE_MIN_OPACITY);
    placeholderCleanupByIdRef.current.set(id, () => {
      stopped = true;
      instance.fabricObject.set("opacity", 1);
      canvas.requestRenderAll();
    });
  };

  const addImagePlaceholder = () => {
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
      strokeWidth: 2,
      strokeDashArray: [10, 6],
      rx: 10,
      ry: 10,
      opacity: IMAGE_PLACEHOLDER_PULSE_MAX_OPACITY,
      strokeUniform: true,
    });

    const id = addObjectToCanvas(placeholder, "image", {
      customId: createCustomId("image-placeholder"),
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
      left: 180,
      top: 160,
      radius: 70,
      fill: options.color ?? "#ef4444",
      stroke: "#7f1d1d",
      strokeWidth: 2,
      strokeUniform: true,
    });

    addObjectToCanvas(circle, "circle", options);
  };

  const addPolygon = (options: AddItemOptions = {}) => {
    const sides = Math.max(3, Math.round(options.sides ?? 5));
    const polygon = new PolygonObject(createRegularPolygonPoints(sides, 70), {
      left: 360,
      top: 140,
      fill: options.color ?? "#6366f1",
      stroke: "#312e81",
      strokeWidth: 2,
      strokeUniform: true,
    });

    addObjectToCanvas(polygon, "polygon", options);
  };

  const addLine = (options: AddItemOptions = {}) => {
    const line = new LineObject([0, 0, 180, 0], {
      left: 220,
      top: 180,
      stroke: options.color ?? "#f97316",
      strokeWidth: 6,
      strokeLineCap: "round",
      strokeUniform: true,
    });

    addObjectToCanvas(line, "line", options);
  };

  const addRectangle = (options: AddItemOptions = {}) => {
    const rectangle = new RectangleObject({
      left: 380,
      top: 180,
      width: 180,
      height: 110,
      fill: options.color ?? "#22c55e",
      stroke: "#14532d",
      strokeWidth: 2,
      strokeUniform: true,
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
    });

    addObjectToCanvas(imageObject, "image", options);
  };

  const addImageFromFile = async (file: File) => {
    const fileUrl = URL.createObjectURL(file);
    try {
      await addImageFromURL(fileUrl);
    } finally {
      URL.revokeObjectURL(fileUrl);
    }
  };

  const addText = (content = "Edit text", options: AddItemOptions = {}) => {
    const text = new TextObject(content, {
      left: 240,
      top: 260,
      width: 260,
      fontSize: 44,
      fill: options.color ?? "#0f172a",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontWeight: 700,
      editable: true,
    });

    addObjectToCanvas(text, "text", options);
  };

  return {
    addCircle,
    addLine,
    addPolygon,
    addRectangle,
    addImagePlaceholder,
    addImageFromFile,
    addImageFromURL,
    removeItemById,
    replaceItemWithImageFromURL,
    addText,
  };
}
