import { Canvas, Point, Rect, util, type FabricObject } from "fabric";
import { FIGMA_BLUE } from "../../../../const";
import type { VideoWorkAreaRect } from "../../export/video-work-area";

export type AspectOption = {
  label: string;
  ratio: number;
};

export type VideoGuideObject = FabricObject & {
  isVideoAreaGuide?: boolean;
};

export type VideoGuideSet = {
  border: Rect;
  dimBottom: Rect;
  dimLeft: Rect;
  dimRight: Rect;
  dimTop: Rect;
};

export type ViewportBounds = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export function isVideoGuideObject(
  object?: FabricObject | null,
): object is VideoGuideObject {
  return Boolean((object as VideoGuideObject | null)?.isVideoAreaGuide);
}

export function createVideoGuideRect(
  options: ConstructorParameters<typeof Rect>[0],
) {
  const rect = new Rect({
    evented: false,
    excludeFromExport: true,
    hasBorders: false,
    hasControls: false,
    hoverCursor: "default",
    lockMovementX: true,
    lockMovementY: true,
    objectCaching: false,
    originX: "left",
    originY: "top",
    selectable: false,
    ...options,
  });
  (rect as VideoGuideObject).isVideoAreaGuide = true;
  rect.set("isVideoAreaGuide", true);
  return rect;
}

export function computeVideoAreaLabelPosition(
  canvas: Canvas,
  rect: VideoWorkAreaRect,
) {
  const transform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  const topLeft = util.transformPoint(
    new Point(rect.left, rect.top),
    transform,
  );
  return {
    left: topLeft.x,
    top: topLeft.y - 24,
  };
}

export function updateGuideObjects(
  guides: VideoGuideSet,
  rect: VideoWorkAreaRect,
  viewport: ViewportBounds,
) {
  const rectBottom = rect.top + rect.height;
  const rectRight = rect.left + rect.width;
  const rowTop = Math.max(rect.top, viewport.top);
  const rowBottom = Math.min(rectBottom, viewport.bottom);
  const rowHeight = Math.max(0, rowBottom - rowTop);

  guides.dimTop.set({
    height: Math.max(0, rect.top - viewport.top),
    left: viewport.left,
    top: viewport.top,
    width: viewport.width,
  });
  guides.dimBottom.set({
    height: Math.max(0, viewport.bottom - rectBottom),
    left: viewport.left,
    top: rectBottom,
    width: viewport.width,
  });
  guides.dimLeft.set({
    height: rowHeight,
    left: viewport.left,
    top: rowTop,
    width: Math.max(0, rect.left - viewport.left),
  });
  guides.dimRight.set({
    height: rowHeight,
    left: rectRight,
    top: rowTop,
    width: Math.max(0, viewport.right - rectRight),
  });
  guides.border.set({
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  });

  guides.dimTop.setCoords();
  guides.dimBottom.setCoords();
  guides.dimLeft.setCoords();
  guides.dimRight.setCoords();
  guides.border.setCoords();
}

/** Converts current Fabric viewport transform into world-space viewport bounds. */
export function getViewportBounds(canvas: Canvas): ViewportBounds {
  const transform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  const zoomX = Math.abs(transform[0]) > 0.0001 ? transform[0] : 1;
  const zoomY = Math.abs(transform[3]) > 0.0001 ? transform[3] : 1;
  const left = -transform[4] / zoomX;
  const top = -transform[5] / zoomY;
  const width = canvas.getWidth() / zoomX;
  const height = canvas.getHeight() / zoomY;
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  };
}
export const guides: VideoGuideSet = {
  border: createVideoGuideRect({
    fill: "transparent",
    stroke: FIGMA_BLUE,
    strokeWidth: 2,
  }),
  dimTop: createVideoGuideRect({
    fill: "rgba(0, 0, 0, 0.42)",
  }),
  dimBottom: createVideoGuideRect({
    fill: "rgba(0, 0, 0, 0.42)",
  }),
  dimLeft: createVideoGuideRect({
    fill: "rgba(0, 0, 0, 0.42)",
  }),
  dimRight: createVideoGuideRect({
    fill: "rgba(0, 0, 0, 0.42)",
  }),
};

export function bringGuidesToFront(canvas: Canvas, guides: VideoGuideSet) {
  const bringObjectToFront = (
    canvas as unknown as {
      bringObjectToFront?: (object: FabricObject) => void;
    }
  ).bringObjectToFront;

  if (typeof bringObjectToFront === "function") {
    bringObjectToFront.call(canvas, guides.dimTop);
    bringObjectToFront.call(canvas, guides.dimBottom);
    bringObjectToFront.call(canvas, guides.dimLeft);
    bringObjectToFront.call(canvas, guides.dimRight);
    bringObjectToFront.call(canvas, guides.border);
    return;
  }

  // Fallback for older/variant Fabric APIs: re-add in desired stacking order.
  canvas.remove(
    guides.dimTop,
    guides.dimBottom,
    guides.dimLeft,
    guides.dimRight,
    guides.border,
  );
  canvas.add(
    guides.dimTop,
    guides.dimBottom,
    guides.dimLeft,
    guides.dimRight,
    guides.border,
  );
}
