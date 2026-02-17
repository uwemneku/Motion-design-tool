import type { Canvas, FabricObject } from "fabric";
import { useDispatch } from "react-redux";
import type { MutableRefObject } from "react";
import type { AnimatableObject } from "../shapes/animatable-object/object";
import type { AnimatableSnapshot } from "../shapes/animatable-object/types";
import { useCanvasAppContext } from "./use-canvas-app-context";
import { setSelectedId, upsertItemRecord } from "../../store/editor-slice";
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
};
const KEYFRAME_EPSILON = 0.001;

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
  const { registerInstance } = useCanvasAppContext();

  const addObjectToCanvas = (
    instance: AnimatableObject,
    typeName: string,
    options: AddItemOptions = {},
  ) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const playheadTime = dispatch(
      dispatchableSelector((state) => state.editor.playheadTime),
    );

    const customId = createCustomId(typeName);
    const object: FabricObject = instance.fabricObject;
    object.customId = customId;
    object.set("customId", customId);
    registerInstance(customId, instance);
    instance.addSnapshotKeyframe(playheadTime, instance.getSnapshot());

    const timelineMarkers = [
      { id: createKeyframeMarkerId(), timestamp: playheadTime },
    ];
    const sortedExtraKeyframes = [...(options.keyframes ?? [])].sort(
      (a, b) => a.time - b.time,
    );
    let currentSnapshot: AnimatableSnapshot = instance.getSnapshot();
    for (const keyframe of sortedExtraKeyframes) {
      if (!Number.isFinite(keyframe.time)) continue;
      const nextSnapshot: AnimatableSnapshot = {
        ...currentSnapshot,
        ...(typeof keyframe.left === "number" ? { left: keyframe.left } : {}),
        ...(typeof keyframe.top === "number" ? { top: keyframe.top } : {}),
        ...(typeof keyframe.scaleX === "number"
          ? { scaleX: keyframe.scaleX }
          : {}),
        ...(typeof keyframe.scaleY === "number"
          ? { scaleY: keyframe.scaleY }
          : {}),
        ...(typeof keyframe.opacity === "number"
          ? { opacity: keyframe.opacity }
          : {}),
        ...(typeof keyframe.angle === "number"
          ? { angle: keyframe.angle }
          : {}),
      };

      instance.addSnapshotKeyframe(keyframe.time, nextSnapshot);
      currentSnapshot = nextSnapshot;

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
          name: typeName,
          keyframe: timelineMarkers.sort((a, b) => a.timestamp - b.timestamp),
        },
      }),
    );
    dispatch(setSelectedId(customId));
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
    const polygon = new PolygonObject(
      createRegularPolygonPoints(sides, 70),
      {
        left: 360,
        top: 140,
        fill: options.color ?? "#6366f1",
        stroke: "#312e81",
        strokeWidth: 2,
        strokeUniform: true,
      },
    );

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
      rx: 6,
      ry: 6,
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
    addImageFromFile,
    addImageFromURL,
    addText,
  };
}
