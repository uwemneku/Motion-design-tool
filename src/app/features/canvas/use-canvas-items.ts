import type { Canvas, FabricObject } from "fabric";
import { useDispatch, useStore } from "react-redux";
import type { MutableRefObject } from "react";
import type { AnimatableObject } from "../shapes/animatable-object/object";
import { useCanvasAppContext } from "./use-canvas-app-context";
import { setSelectedId, upsertItemRecord } from "../../store/editor-slice";
import type { AppDispatch, RootState } from "../../store";
import { CircleObject, ImageObject, PolygonObject, TextObject } from "../shapes/objects";

type UseCanvasItemsParams = {
  fabricCanvas: MutableRefObject<Canvas | null>;
};

function createCustomId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createKeyframeMarkerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `kf-${crypto.randomUUID()}`;
  }
  return `kf-${Math.random().toString(36).slice(2, 10)}`;
}

export function useCanvasItems({ fabricCanvas }: UseCanvasItemsParams) {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { registerInstance } = useCanvasAppContext();

  const addObjectToCanvas = (instance: AnimatableObject, typeName: string) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const playheadTime = store.getState().editor.playheadTime;

    const customId = createCustomId(typeName);
    const object: FabricObject = instance.fabricObject;
    object.customId = customId;
    object.set("customId", customId);
    registerInstance(customId, instance);
    instance.addSnapshotKeyframe(playheadTime, instance.getSnapshot());

    const keyframeId = createKeyframeMarkerId();

    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();

    dispatch(
      upsertItemRecord({
        id: customId,
        value: {
          name: typeName,
          keyframe: [{ id: keyframeId, timestamp: playheadTime }],
        },
      }),
    );
    dispatch(setSelectedId(customId));
  };

  const addCircle = () => {
    const circle = new CircleObject({
      left: 180,
      top: 160,
      radius: 70,
      fill: "#ef4444",
      stroke: "#7f1d1d",
      strokeWidth: 2,
    });

    addObjectToCanvas(circle, "circle");
  };

  const addPolygon = () => {
    const polygon = new PolygonObject(
      [
        { x: 40, y: 0 },
        { x: 0, y: 80 },
        { x: 60, y: 140 },
        { x: 130, y: 90 },
        { x: 120, y: 20 },
      ],
      {
        left: 360,
        top: 140,
        fill: "#6366f1",
        stroke: "#312e81",
        strokeWidth: 2,
      },
    );

    addObjectToCanvas(polygon, "polygon");
  };

  const addImageFromFile = async (file: File) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const fileUrl = URL.createObjectURL(file);
    try {
      const imageObject = await ImageObject.fromURL(fileUrl);
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

      addObjectToCanvas(imageObject, "image");
    } finally {
      URL.revokeObjectURL(fileUrl);
    }
  };

  const addText = () => {
    const text = new TextObject("Edit text", {
      left: 240,
      top: 260,
      width: 260,
      fontSize: 44,
      fill: "#0f172a",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontWeight: 700,
      editable: true,
    });

    addObjectToCanvas(text, "text");
  };

  return {
    addCircle,
    addPolygon,
    addImageFromFile,
    addText,
  };
}
