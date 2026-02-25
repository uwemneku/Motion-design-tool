import { Canvas, Rect, type FabricObject } from "fabric";
import type {
  AnimatableProperties,
  ColorKeyframesByProperty,
  KeyframesByProperty,
} from "../../shapes/animatable-object/types";
import type { RootState } from "../../../store";
import { NUMERIC_ANIMATABLE_PROPERTIES } from "../../../../const";

/** Util.Ts hook logic. */
export async function validateImageUrl(url: string) {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Image could not be loaded from the provided URL."));
    image.src = url;
  });
}

export function createRegularPolygonPoints(sides: number, radius: number) {
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

/** Returns stable pixel dimensions derived from the canvas host container. */
export function getHostContainerSize(container: HTMLElement) {
  return {
    height: Math.max(1, Math.round(container.clientHeight)),
    width: Math.max(1, Math.round(container.clientWidth)),
  };
}

/** Syncs Fabric canvas dimensions to its host container dimensions. */
export function syncCanvasSizeToContainer(
  canvas: Canvas,
  container: HTMLDivElement,
) {
  const { height, width } = getHostContainerSize(container);
  if (canvas.getWidth() === width && canvas.getHeight() === height) return;
  canvas.setDimensions({ height, width });
  canvas.requestRenderAll();
}

export function getPropertiesForTransformAction(action?: string) {
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

export function createKeyframeMarkerId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `kf-${crypto.randomUUID()}`;
  }
  return `kf-${Math.random().toString(36).slice(2, 10)}`;
}

export type CanvasHistoryAction = {
  redo: () => void;
  undo: () => void;
};

export type ItemMutationSnapshot = {
  customId: string;
  instance?: {
    colorKeyframes: ColorKeyframesByProperty;
    keyframes: KeyframesByProperty;
  };
  itemRecord?: RootState["editor"]["itemsRecord"][string];
};

export type TransformSnapshot = {
  angle: number;
  left: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  top: number;
};

export const hoverOutlineRect = new Rect({
  evented: false,
  excludeFromExport: true,
  fill: "transparent",
  hasBorders: false,
  hasControls: false,
  lockMovementX: true,
  lockMovementY: true,
  objectCaching: false,
  originX: "center",
  originY: "center",
  selectable: false,
  stroke: "rgba(56, 189, 248, 0.9)",
  strokeDashArray: [6, 4],
  strokeWidth: 3,
  visible: false,
});

export function showGlobalHoverOutlineForObject(hoveredObject: FabricObject) {
  const width = Math.max(1, hoveredObject.getScaledWidth());
  const height = Math.max(1, hoveredObject.getScaledHeight());
  hoverOutlineRect.set({
    angle: hoveredObject.angle ?? 0,
    height: height + 10,
    left: hoveredObject.left ?? 0,
    top: hoveredObject.top ?? 0,
    visible: true,
    width: width + 10,
  });
  hoverOutlineRect.setCoords();
}

export function readTransformSnapshot(object: {
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
