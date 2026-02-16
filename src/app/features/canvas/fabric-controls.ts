import { Canvas, FabricObject } from "fabric";

const FIGMA_BLUE = "#2563eb";
const FIGMA_BLUE_LIGHT = "rgba(37, 99, 235, 0.12)";

function styleObjectControls(object: FabricObject) {
  object.set({
    borderColor: FIGMA_BLUE,
    borderScaleFactor: 1,
    cornerColor: "#ffffff",
    cornerStrokeColor: FIGMA_BLUE,
    cornerStyle: "circle",
    cornerSize: 10,
    transparentCorners: false,
    padding: 0,
  });

  object.setControlsVisibility({
    mtr: false,
  });
}

export function applyFigmaLikeControls(canvas: Canvas) {
  canvas.set({
    selectionColor: FIGMA_BLUE_LIGHT,
    selectionBorderColor: FIGMA_BLUE,
    selectionLineWidth: 1,
  });

  FabricObject.ownDefaults = {
    ...FabricObject.ownDefaults,
    borderColor: FIGMA_BLUE,
    borderScaleFactor: 1,
    cornerColor: "#ffffff",
    cornerStrokeColor: FIGMA_BLUE,
    cornerStyle: "circle",
    cornerSize: 10,
    transparentCorners: false,
    padding: 0,
  };

  canvas.getObjects().forEach((object) => {
    styleObjectControls(object);
  });

  canvas.on("object:added", ({ target }) => {
    if (!target) return;
    styleObjectControls(target);
  });

  canvas.requestRenderAll();
}
