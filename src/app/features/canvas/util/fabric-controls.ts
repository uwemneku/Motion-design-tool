/** Fabric Controls.Ts module implementation. */
import { Canvas, FabricObject, Line } from "fabric";
import { FIGMA_BLUE, MAX_BORDER_SCALE_FACTOR, MIN_BORDER_SCALE_FACTOR } from "../../../../const";

const SELECTION_PADDING = 6;

/** Applies the app's simplified selection styling to one Fabric object. */
function styleObjectControls(object: FabricObject) {
  object.set({
    borderColor: FIGMA_BLUE,
    borderScaleFactor: 1,
    cornerColor: "#ffffff",
    cornerStrokeColor: FIGMA_BLUE,
    cornerStyle: "rect",
    cornerSize: 9,
    transparentCorners: false,
    padding: SELECTION_PADDING,
  });

  if (object instanceof Line) {
    object.setControlsVisibility({
      bl: false,
      br: false,
      mb: false,
      ml: true,
      mr: true,
      mt: false,
      mtr: false,
      tl: false,
      tr: false,
    });
    return;
  }

  object.setControlsVisibility({
    bl: true,
    br: true,
    mb: true,
    ml: true,
    mr: true,
    mt: true,
    mtr: true,
    tl: true,
    tr: true,
  });
}

/** Keeps selection strokes visually stable as the canvas zoom changes. */
function getZoomAwareBorderScaleFactor(canvas: Canvas) {
  const zoom = canvas.getZoom();
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.min(MAX_BORDER_SCALE_FACTOR, Math.max(MIN_BORDER_SCALE_FACTOR, 1 / zoom));
}

/** Syncs border scale across all live Fabric objects after viewport zoom changes. */
export function syncObjectControlBorderScale(canvas: Canvas) {
  const borderScaleFactor = getZoomAwareBorderScaleFactor(canvas);
  canvas.getObjects().forEach((object) => {
    object.set({
      borderScaleFactor,
    });
  });
}

/** Applies the global selection-control theme used by the editor canvas. */
export function applyFigmaLikeControls(canvas: Canvas) {
  const borderScaleFactor = getZoomAwareBorderScaleFactor(canvas);
  canvas.set({
    selectionColor: "rgba(0,0,0,0)",
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
    cornerSize: 9,
    transparentCorners: false,
    padding: SELECTION_PADDING,
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
