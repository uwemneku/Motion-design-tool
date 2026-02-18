import { Canvas, FabricObject } from "fabric";
import {
  FIGMA_BLUE,
  FIGMA_BLUE_LIGHT,
  MAX_BORDER_SCALE_FACTOR,
  MIN_BORDER_SCALE_FACTOR,
} from "../../const";

function styleObjectControls(object: FabricObject) {
  object.set({
    borderColor: FIGMA_BLUE,
    borderScaleFactor: 1,
    cornerColor: "#ffffff",
    cornerStrokeColor: FIGMA_BLUE,
    cornerStyle: "rect",
    cornerSize: 10,
    transparentCorners: false,
    padding: 0,
  });
}

function getZoomAwareBorderScaleFactor(canvas: Canvas) {
  const zoom = canvas.getZoom();
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.min(
    MAX_BORDER_SCALE_FACTOR,
    Math.max(MIN_BORDER_SCALE_FACTOR, 1 / zoom),
  );
}

export function syncObjectControlBorderScale(canvas: Canvas) {
  const borderScaleFactor = getZoomAwareBorderScaleFactor(canvas);
  canvas.getObjects().forEach((object) => {
    object.set({
      borderScaleFactor,
    });
  });
}

export function applyFigmaLikeControls(canvas: Canvas) {
  const borderScaleFactor = getZoomAwareBorderScaleFactor(canvas);
  canvas.set({
    selectionColor: FIGMA_BLUE_LIGHT,
    selectionBorderColor: FIGMA_BLUE,
    selectionLineWidth: 1,
  });

  FabricObject.ownDefaults = {
    ...FabricObject.ownDefaults,
    borderColor: FIGMA_BLUE,
    borderScaleFactor,
    cornerColor: "#ffffff",
    cornerStrokeColor: FIGMA_BLUE,
    cornerStyle: "rect",
    cornerSize: 10,
    transparentCorners: false,
    padding: 0,
  };

  canvas.getObjects().forEach((object) => {
    styleObjectControls(object);
  });
  syncObjectControlBorderScale(canvas);

  canvas.on("object:added", ({ target }) => {
    if (!target) return;
    styleObjectControls(target);
    target.set({
      borderScaleFactor: getZoomAwareBorderScaleFactor(canvas),
    });
  });

  canvas.requestRenderAll();
}
