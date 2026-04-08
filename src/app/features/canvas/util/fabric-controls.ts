/** Fabric Controls.Ts module implementation. */
import { Canvas, Control, controlsUtils, FabricObject, Line, Path, Point } from "fabric";
import { FIGMA_BLUE, MAX_BORDER_SCALE_FACTOR, MIN_BORDER_SCALE_FACTOR } from "../../../../const";

const EDGE_CONTROL_LENGTH = 18;
const EDGE_CONTROL_RADIUS = 3;
const EDGE_CONTROL_THICKNESS = 2;
const EDGE_CONTROL_TOUCH_LENGTH = 26;
const EDGE_CONTROL_TOUCH_THICKNESS = 18;
const MIN_EDGE_SPAN = 12;
const SELECTION_PADDING = 6;
const ACTIVE_PATH_POINT_COLOR = "#f97316";
const PATH_CONTROL_DEEP_BLUE = "#1d4ed8";

export type PathPointMode = "independent" | "mirrored" | "sharp";
const DEFAULT_PATH_POINT_MODE: PathPointMode = "mirrored";

/** Returns whether normal transform handles should be rendered by the custom DOM overlay. */
export function usesDomTransformHandles(object: FabricObject) {
  return !(object instanceof Line) && !(object instanceof Path);
}

/** Measures the rendered gap between the corner controls for one axis. */
function getEdgeSpan(object: FabricObject, startKey: "tl" | "tr", endKey: "tr" | "bl") {
  object.setCoords();

  const start = object.oCoords?.[startKey];
  const end = object.oCoords?.[endKey];
  const cornerSize = Math.max(object.cornerSize ?? 0, EDGE_CONTROL_LENGTH);

  if (!start || !end) return MIN_EDGE_SPAN;

  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  return Math.max(MIN_EDGE_SPAN, Math.round(distance - cornerSize));
}

/** Renders a rounded middle-edge grip similar to Figma's resize handles. */
function renderEdgeControl(
  this: Control,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Parameters<typeof controlsUtils.renderSquareControl>[3],
  fabricObject: FabricObject,
) {
  ctx.save();
  ctx.globalAlpha = 0;
  const { stroke, xSize, ySize, opName } = this.commonRenderProps(
    ctx,
    left,
    top,
    fabricObject,
    styleOverride,
  );
  const width = xSize;
  const height = ySize;
  const radius = Math.min(EDGE_CONTROL_RADIUS, width / 2, height / 2);
  const x = -width / 2;
  const y = -height / 2;

  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();
  ctx[opName]();
  if (stroke) {
    ctx.stroke();
  }
  ctx.restore();
}

/** Builds a compact side control with a larger invisible hit area. */
function createEdgeControl(
  baseControl: Control | undefined,
  options: {
    actionHandler?: Control["actionHandler"];
    actionName?: string;
    cursorStyleHandler?: Control["cursorStyleHandler"];
    touchSizeX: number;
    touchSizeY: number;
    x: number;
    y: number;
    sizeX: number;
    sizeY: number;
  },
) {
  return new Control({
    ...baseControl,
    ...options,
    render: renderEdgeControl,
  });
}

/** Updates the middle-edge controls to use compact Figma-like resize grips. */
function syncEdgeControlSizes(object: FabricObject) {
  const horizontalSpan = getEdgeSpan(object, "tl", "tr");
  const verticalSpan = getEdgeSpan(object, "tl", "bl");

  object.controls = {
    ...object.controls,
    ml: createEdgeControl(object.controls.ml, {
      actionHandler: object.controls.ml?.actionHandler,
      actionName: object.controls.ml?.actionName,
      cursorStyleHandler: object.controls.ml?.cursorStyleHandler,
      sizeX: EDGE_CONTROL_THICKNESS,
      sizeY: verticalSpan,
      touchSizeX: EDGE_CONTROL_TOUCH_THICKNESS,
      touchSizeY: Math.max(verticalSpan, EDGE_CONTROL_TOUCH_LENGTH),
      x: -0.5,
      y: 0,
    }),
    mr: createEdgeControl(object.controls.mr, {
      actionHandler: object.controls.mr?.actionHandler,
      actionName: object.controls.mr?.actionName,
      cursorStyleHandler: object.controls.mr?.cursorStyleHandler,
      sizeX: EDGE_CONTROL_THICKNESS,
      sizeY: verticalSpan,
      touchSizeX: EDGE_CONTROL_TOUCH_THICKNESS,
      touchSizeY: Math.max(verticalSpan, EDGE_CONTROL_TOUCH_LENGTH),
      x: 0.5,
      y: 0,
    }),
    mt: createEdgeControl(object.controls.mt, {
      actionHandler: object.controls.mt?.actionHandler,
      actionName: object.controls.mt?.actionName,
      cursorStyleHandler: object.controls.mt?.cursorStyleHandler,
      sizeX: horizontalSpan,
      sizeY: EDGE_CONTROL_THICKNESS,
      touchSizeX: Math.max(horizontalSpan, EDGE_CONTROL_TOUCH_LENGTH),
      touchSizeY: EDGE_CONTROL_TOUCH_THICKNESS,
      x: 0,
      y: -0.5,
    }),
    mb: createEdgeControl(object.controls.mb, {
      actionHandler: object.controls.mb?.actionHandler,
      actionName: object.controls.mb?.actionName,
      cursorStyleHandler: object.controls.mb?.cursorStyleHandler,
      sizeX: horizontalSpan,
      sizeY: EDGE_CONTROL_THICKNESS,
      touchSizeX: Math.max(horizontalSpan, EDGE_CONTROL_TOUCH_LENGTH),
      touchSizeY: EDGE_CONTROL_TOUCH_THICKNESS,
      x: 0,
      y: 0.5,
    }),
  };
}

/** Adds draggable point controls to selected path objects so users can edit the path directly. */
function syncPathControls(object: FabricObject) {
  if (!(object instanceof Path)) return;

  const nextControls = Object.fromEntries(
    Object.entries(object.controls).filter(([key]) => !key.startsWith("c_")),
  );
  if (!object.isPathEditing) {
    object.controls = nextControls;
    return;
  }

  const pathControls = controlsUtils.createPathControls(object, {
    sizeX: 8,
    sizeY: 8,
    touchSizeX: 16,
    touchSizeY: 16,
    pointStyle: {
      controlFill: "#ffffff",
      controlStroke: FIGMA_BLUE,
    },
    controlPointStyle: {
      controlFill: PATH_CONTROL_DEEP_BLUE,
      controlStroke: PATH_CONTROL_DEEP_BLUE,
      connectionDashArray: [4, 3],
    },
  });

  object.controls = createMirroredPathControls({
    ...nextControls,
    ...removeClosingEndpointPointControl(object, pathControls),
  });
}

/** Wraps path controls so mirrored handles and closed-path endpoints stay in sync. */
function createMirroredPathControls(controls: Record<string, Control>) {
  return Object.fromEntries(
    Object.entries(controls).map(([key, control]) => {
      const baseActionHandler = control.actionHandler;
      return [
        key,
        new Control({
          ...control,
          getVisibility(fabricObject, controlKey) {
            if (!(fabricObject instanceof Path) || !controlKey.includes("_C_CP_")) {
              return control.getVisibility?.(fabricObject, controlKey) ?? true;
            }

            const anchorCommandIndex = getAnchorCommandIndexForControl(fabricObject, controlKey);
            if (anchorCommandIndex === null) return false;

            return (
              fabricObject.activePathAnchorCommandIndex === anchorCommandIndex &&
              getPathPointMode(fabricObject, anchorCommandIndex) !== "sharp"
            );
          },
          mouseDownHandler(eventData, transform, x, y) {
            if (transform.target instanceof Path) {
              setActivePathAnchorForControl(transform.target, key);
            }
            return control.mouseDownHandler?.call(this, eventData, transform, x, y) ?? false;
          },
          render(ctx, left, top, styleOverride, fabricObject) {
            if (fabricObject instanceof Path) {
              if (isActivePathAnchorControl(fabricObject, key) && !key.includes("_CP_")) {
                renderActivePathAnchor(ctx, left, top, this, fabricObject);
                return;
              }
              renderMirroredHandleGuide(ctx, fabricObject, key);
            }
            control.render?.call(this, ctx, left, top, styleOverride, fabricObject);
          },
          actionHandler(eventData, transform, x, y) {
            if (!baseActionHandler) {
              return false;
            }
            const beforeAnchorPoint =
              transform.target instanceof Path
                ? readAnchorPointForControl(transform.target, key)
                : null;
            const anchorDescriptor =
              transform.target instanceof Path
                ? getAnchorDescriptorForControl(transform.target, key)
                : null;
            const didChange = baseActionHandler.call(this, eventData, transform, x, y);
            if (!didChange || !(transform.target instanceof Path)) {
              return didChange;
            }

            setActivePathAnchorForControl(transform.target, key);
            const activeAnchorCommandIndex = getAnchorCommandIndexForControl(transform.target, key);
            const pointMode =
              activeAnchorCommandIndex === null
                ? DEFAULT_PATH_POINT_MODE
                : getPathPointMode(transform.target, activeAnchorCommandIndex);

            if (key.includes("_C_CP_") && pointMode === "mirrored") {
              syncMirroredBezierHandle(transform.target, key);
            } else {
              moveAttachedHandlesWithAnchor(transform.target, key, beforeAnchorPoint);
            }
            syncClosedPathEndpoint(transform.target, key);
            refreshPathBounds(transform.target, anchorDescriptor);
            return didChange;
          },
        }),
      ];
    }),
  );
}

/** Draws one continuous guide across a mirrored-handle pair so the anchor relationship is clear. */
function renderMirroredHandleGuide(ctx: CanvasRenderingContext2D, path: Path, controlKey: string) {
  if (!controlKey.endsWith("CP_1")) return;

  const pair = getMirroredHandlePair(path, controlKey);
  if (!pair) return;
  if (getPathPointMode(path, pair.active.anchorCommandIndex) !== "mirrored") return;

  const activeHandle = getPathPointScreenPosition(
    path,
    pair.active.commandIndex,
    pair.active.pointIndex,
  );
  const anchorPoint = getPathPointScreenPosition(
    path,
    pair.active.anchorCommandIndex,
    pair.active.anchorPointIndex,
  );
  const oppositeHandle = getPathPointScreenPosition(
    path,
    pair.opposite.commandIndex,
    pair.opposite.pointIndex,
  );

  ctx.save();
  ctx.strokeStyle = PATH_CONTROL_DEEP_BLUE;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(activeHandle.x, activeHandle.y);
  ctx.lineTo(anchorPoint.x, anchorPoint.y);
  ctx.lineTo(oppositeHandle.x, oppositeHandle.y);
  ctx.stroke();
  ctx.restore();
}

/** Mirrors the paired cubic handle exactly across the anchor so edits stay reflective. */
function syncMirroredBezierHandle(path: Path, controlKey: string) {
  const pair = getMirroredHandlePair(path, controlKey);
  if (!pair) return;

  const activeHandle = readPathPoint(path, pair.active.commandIndex, pair.active.pointIndex);
  const anchorPoint = readPathPoint(
    path,
    pair.active.anchorCommandIndex,
    pair.active.anchorPointIndex,
  );
  const mirroredHandle = new Point(
    anchorPoint.x + (anchorPoint.x - activeHandle.x),
    anchorPoint.y + (anchorPoint.y - activeHandle.y),
  );

  setPathPointWithAnchorPreserved(
    path,
    pair.opposite.commandIndex,
    pair.opposite.pointIndex,
    mirroredHandle,
    pair.opposite.anchorCommandIndex,
    pair.opposite.anchorPointIndex,
  );
}

function getMirroredHandlePair(path: Path, controlKey: string) {
  const match = /^c_(\d+)_C_CP_(1|2)$/.exec(controlKey);
  if (!match) return null;

  const commandIndex = Number(match[1]);
  const handleNumber = Number(match[2]);
  if (!Number.isInteger(commandIndex) || (handleNumber !== 1 && handleNumber !== 2)) {
    return null;
  }

  if (handleNumber === 1) {
    const previousCommandIndex = getPreviousDrawableCommandIndex(path, commandIndex);
    if (previousCommandIndex === null || path.path[previousCommandIndex]?.[0] !== "C") {
      return null;
    }
    const anchorCommandIndex = resolveAnchorCommandIndex(path, previousCommandIndex, commandIndex, 1);

    return {
      active: {
        commandIndex,
        pointIndex: 1,
        anchorCommandIndex,
        anchorPointIndex:
          anchorCommandIndex === 0 ? 1 : getEndpointPointIndex(path.path[previousCommandIndex]),
      },
      opposite: {
        commandIndex: previousCommandIndex,
        pointIndex: 3,
        anchorCommandIndex,
        anchorPointIndex:
          anchorCommandIndex === 0 ? 1 : getEndpointPointIndex(path.path[previousCommandIndex]),
      },
    };
  }

  const nextCommandIndex = getNextDrawableCommandIndex(path, commandIndex);
  if (nextCommandIndex === null || path.path[nextCommandIndex]?.[0] !== "C") {
    return null;
  }
  const anchorCommandIndex = resolveAnchorCommandIndex(path, commandIndex, nextCommandIndex, 2);

  return {
    active: {
      commandIndex,
      pointIndex: 3,
      anchorCommandIndex,
      anchorPointIndex: anchorCommandIndex === 0 ? 1 : getEndpointPointIndex(path.path[commandIndex]),
    },
    opposite: {
      commandIndex: nextCommandIndex,
      pointIndex: 1,
      anchorCommandIndex,
      anchorPointIndex: anchorCommandIndex === 0 ? 1 : getEndpointPointIndex(path.path[commandIndex]),
    },
  };
}

function getPreviousDrawableCommandIndex(path: Path, commandIndex: number) {
  const closingCommandIndex = getClosingCommandIndex(path);
  if (closingCommandIndex !== null && commandIndex === getFirstSegmentCommandIndex(path)) {
    return closingCommandIndex;
  }

  for (let index = commandIndex - 1; index >= 0; index -= 1) {
    if (path.path[index]?.[0] !== "Z") {
      return index;
    }
  }

  if (!path.path.some((command) => command[0] === "Z")) return null;

  for (let index = path.path.length - 1; index >= 0; index -= 1) {
    if (path.path[index]?.[0] !== "Z") {
      return index;
    }
  }

  return null;
}

function getNextDrawableCommandIndex(path: Path, commandIndex: number) {
  const closingCommandIndex = getClosingCommandIndex(path);
  if (closingCommandIndex !== null && commandIndex === closingCommandIndex) {
    return getFirstSegmentCommandIndex(path);
  }

  for (let index = commandIndex + 1; index < path.path.length; index += 1) {
    if (path.path[index]?.[0] !== "Z") {
      return index;
    }
  }

  if (!path.path.some((command) => command[0] === "Z")) return null;

  for (let index = 1; index < commandIndex; index += 1) {
    if (path.path[index]?.[0] !== "Z") {
      return index;
    }
  }

  return null;
}

function getEndpointPointIndex(command: (string | number)[]) {
  return command.length - 2;
}

function readPathPoint(path: Path, commandIndex: number, pointIndex: number) {
  const command = path.path[commandIndex];
  return new Point(Number(command[pointIndex]), Number(command[pointIndex + 1]));
}

function getPathPointScreenPosition(path: Path, commandIndex: number, pointIndex: number) {
  const point = readPathPoint(path, commandIndex, pointIndex);
  return point
    .subtract(path.pathOffset)
    .transform(path.group ? path.calcTransformMatrix() : path.calcOwnMatrix())
    .transform(path.getViewportTransform());
}

function removeClosingEndpointPointControl(path: Path, controls: Record<string, Control>) {
  const closingCommandIndex = getClosingCommandIndex(path);
  if (closingCommandIndex === null) return controls;

  const closingCommand = path.path[closingCommandIndex];
  const closingPointControlKey = `c_${closingCommandIndex}_${closingCommand[0]}`;
  return Object.fromEntries(
    Object.entries(controls).filter(([key]) => key !== closingPointControlKey),
  );
}

function getClosingCommandIndex(path: Path) {
  if (path.path.length < 3) return null;

  const firstCommand = path.path[0];
  const lastCommand = path.path[path.path.length - 1];
  if (!firstCommand || !lastCommand) return null;
  if (firstCommand[0] !== "M" || lastCommand[0] === "M" || lastCommand[0] === "Z") {
    return null;
  }

  if (path.isClosedPath) {
    return path.path.length - 1;
  }

  const lastPointIndex = getEndpointPointIndex(lastCommand);
  const isClosingToStart =
    Math.abs(Number(lastCommand[lastPointIndex]) - Number(firstCommand[1])) <= 0.001 &&
    Math.abs(Number(lastCommand[lastPointIndex + 1]) - Number(firstCommand[2])) <= 0.001;

  return isClosingToStart ? path.path.length - 1 : null;
}

function getFirstSegmentCommandIndex(path: Path) {
  return path.path.length > 1 ? 1 : 0;
}

function getPathPointModes(path: Path) {
  if (!path.pathPointModes) {
    path.pathPointModes = {};
    path.set("pathPointModes", {});
  }
  return path.pathPointModes;
}

function isActivePathAnchorControl(path: Path, controlKey: string) {
  const anchorCommandIndex = getAnchorCommandIndexForControl(path, controlKey);
  return (
    anchorCommandIndex !== null &&
    Number.isInteger(path.activePathAnchorCommandIndex) &&
    Number(path.activePathAnchorCommandIndex) === anchorCommandIndex
  );
}

function renderActivePathAnchor(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  control: Partial<Control>,
  fabricObject: FabricObject,
) {
  const size = control.sizeX ?? fabricObject.cornerSize ?? 8;
  const strokeWidth = 2;
  const half = size / 2;

  ctx.save();
  ctx.fillStyle = ACTIVE_PATH_POINT_COLOR;
  ctx.strokeStyle = ACTIVE_PATH_POINT_COLOR;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.rect(left - half, top - half, size, size);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function getPathPointMode(path: Path, anchorCommandIndex: number): PathPointMode {
  return getPathPointModes(path)[String(anchorCommandIndex)] ?? DEFAULT_PATH_POINT_MODE;
}

function setPathPointMode(path: Path, anchorCommandIndex: number, mode: PathPointMode) {
  const nextModes = {
    ...getPathPointModes(path),
    [String(anchorCommandIndex)]: mode,
  };
  path.pathPointModes = nextModes;
  path.set("pathPointModes", nextModes);
}

function setActivePathAnchorForControl(path: Path, controlKey: string) {
  const anchorCommandIndex = getAnchorCommandIndexForControl(path, controlKey);
  if (anchorCommandIndex === null) return;
  path.activePathAnchorCommandIndex = anchorCommandIndex;
  path.set("activePathAnchorCommandIndex", anchorCommandIndex);
  refreshObjectControls(path);
  path.canvas?.requestRenderAll();
}

function getAnchorCommandIndexForControl(path: Path, controlKey: string) {
  if (controlKey === "c_0_M") {
    return 0;
  }

  const pointMatch = /^c_(\d+)_C$/.exec(controlKey);
  if (pointMatch) {
    const commandIndex = Number(pointMatch[1]);
    return Number.isInteger(commandIndex) ? commandIndex : null;
  }

  const handleMatch = /^c_(\d+)_C_CP_(1|2)$/.exec(controlKey);
  if (!handleMatch) return null;

  const commandIndex = Number(handleMatch[1]);
  const handleNumber = Number(handleMatch[2]) as 1 | 2;
  if (!Number.isInteger(commandIndex)) return null;
  if (handleNumber === 2) return commandIndex;

  const previousCommandIndex = getPreviousDrawableCommandIndex(path, commandIndex);
  if (previousCommandIndex === null) return null;
  return resolveAnchorCommandIndex(path, previousCommandIndex, commandIndex, handleNumber);
}

function resolveAnchorCommandIndex(
  path: Path,
  previousCommandIndex: number,
  commandIndex: number,
  handleNumber: 1 | 2,
) {
  const closingCommandIndex = getClosingCommandIndex(path);
  const firstSegmentCommandIndex = getFirstSegmentCommandIndex(path);

  if (handleNumber === 1) {
    if (closingCommandIndex !== null && commandIndex === firstSegmentCommandIndex) {
      return 0;
    }
    return previousCommandIndex;
  }

  if (closingCommandIndex !== null && commandIndex === closingCommandIndex) {
    return 0;
  }

  return commandIndex;
}

/** Reads the anchor point affected by a path control before or after a drag. */
function readAnchorPointForControl(path: Path, controlKey: string) {
  const descriptor = getAnchorDescriptorForControl(path, controlKey);
  if (!descriptor) return null;
  return readPathPoint(path, descriptor.commandIndex, descriptor.pointIndex);
}

function getAnchorDescriptorForControl(path: Path, controlKey: string) {
  const moveMatch = /^c_(\d+)_(M|C)$/.exec(controlKey);
  if (!moveMatch) return null;

  const commandIndex = Number(moveMatch[1]);
  const commandType = moveMatch[2];
  if (!Number.isInteger(commandIndex)) return null;

  if (commandType === "M") {
    return {
      commandIndex,
      pointIndex: 1,
    };
  }

  const command = path.path[commandIndex];
  if (!command || command[0] !== "C") return null;

  return {
    commandIndex,
    pointIndex: getEndpointPointIndex(command),
  };
}

/** Moves the incoming and outgoing handles with their anchor so tangents stay aligned. */
function moveAttachedHandlesWithAnchor(
  path: Path,
  controlKey: string,
  beforeAnchorPoint: Point | null,
) {
  if (!beforeAnchorPoint) return;

  const anchorDescriptor = getAnchorDescriptorForControl(path, controlKey);
  if (!anchorDescriptor) return;

  const afterAnchorPoint = readPathPoint(path, anchorDescriptor.commandIndex, anchorDescriptor.pointIndex);
  const delta = afterAnchorPoint.subtract(beforeAnchorPoint);
  if (Math.abs(delta.x) <= 0.0001 && Math.abs(delta.y) <= 0.0001) return;

  const incomingHandle = getIncomingHandleForAnchor(path, anchorDescriptor.commandIndex);
  if (incomingHandle) {
    const point = readPathPoint(path, incomingHandle.commandIndex, incomingHandle.pointIndex).add(delta);
    const command = path.path[incomingHandle.commandIndex];
    command[incomingHandle.pointIndex] = point.x;
    command[incomingHandle.pointIndex + 1] = point.y;
  }

  const outgoingHandle = getOutgoingHandleForAnchor(path, anchorDescriptor.commandIndex);
  if (outgoingHandle) {
    const point = readPathPoint(path, outgoingHandle.commandIndex, outgoingHandle.pointIndex).add(delta);
    const command = path.path[outgoingHandle.commandIndex];
    command[outgoingHandle.pointIndex] = point.x;
    command[outgoingHandle.pointIndex + 1] = point.y;
  }
}

function getIncomingHandleForAnchor(path: Path, anchorCommandIndex: number) {
  if (anchorCommandIndex === 0) {
    const closingCommandIndex = getClosingCommandIndex(path);
    if (closingCommandIndex === null) return null;
    const closingCommand = path.path[closingCommandIndex];
    if (!closingCommand || closingCommand[0] !== "C") return null;
    return {
      commandIndex: closingCommandIndex,
      pointIndex: 3,
    };
  }

  const command = path.path[anchorCommandIndex];
  if (!command || command[0] !== "C") return null;
  return {
    commandIndex: anchorCommandIndex,
    pointIndex: 3,
  };
}

function getOutgoingHandleForAnchor(path: Path, anchorCommandIndex: number) {
  const nextCommandIndex =
    anchorCommandIndex === 0 ? getFirstSegmentCommandIndex(path) : getNextDrawableCommandIndex(path, anchorCommandIndex);
  if (nextCommandIndex === null) return null;

  const nextCommand = path.path[nextCommandIndex];
  if (!nextCommand || nextCommand[0] !== "C") return null;
  return {
    commandIndex: nextCommandIndex,
    pointIndex: 1,
  };
}

export function applyPathPointMode(path: Path, anchorCommandIndex: number, mode: PathPointMode) {
  setPathPointMode(path, anchorCommandIndex, mode);
  path.activePathAnchorCommandIndex = anchorCommandIndex;
  path.set("activePathAnchorCommandIndex", anchorCommandIndex);

  const anchorDescriptor =
    anchorCommandIndex === 0
      ? { commandIndex: 0, pointIndex: 1 }
      : {
          commandIndex: anchorCommandIndex,
          pointIndex: getEndpointPointIndex(path.path[anchorCommandIndex]),
        };
  const anchorPoint = readPathPoint(path, anchorDescriptor.commandIndex, anchorDescriptor.pointIndex);

  if (mode === "sharp") {
    const incomingHandle = getIncomingHandleForAnchor(path, anchorCommandIndex);
    if (incomingHandle) {
      const command = path.path[incomingHandle.commandIndex];
      command[incomingHandle.pointIndex] = anchorPoint.x;
      command[incomingHandle.pointIndex + 1] = anchorPoint.y;
    }
    const outgoingHandle = getOutgoingHandleForAnchor(path, anchorCommandIndex);
    if (outgoingHandle) {
      const command = path.path[outgoingHandle.commandIndex];
      command[outgoingHandle.pointIndex] = anchorPoint.x;
      command[outgoingHandle.pointIndex + 1] = anchorPoint.y;
    }
    syncClosedPathEndpoint(path, "c_0_M");
    refreshPathBounds(path, anchorDescriptor);
  } else {
    ensureVisibleHandlesForAnchor(path, anchorCommandIndex, anchorPoint, mode);
  }

  refreshObjectControls(path);
  path.fire("my:custom:seek", {
    target: path,
  });
  path.canvas?.requestRenderAll();
}

export function getPathAnchorScreenPosition(path: Path, anchorCommandIndex: number) {
  if (anchorCommandIndex === 0) {
    return getPathPointScreenPosition(path, 0, 1);
  }

  const command = path.path[anchorCommandIndex];
  if (!command) return null;
  return getPathPointScreenPosition(path, anchorCommandIndex, getEndpointPointIndex(command));
}

function ensureVisibleHandlesForAnchor(
  path: Path,
  anchorCommandIndex: number,
  anchorPoint: Point,
  mode: PathPointMode,
) {
  const incomingHandle = getIncomingHandleForAnchor(path, anchorCommandIndex);
  const outgoingHandle = getOutgoingHandleForAnchor(path, anchorCommandIndex);
  if (!incomingHandle || !outgoingHandle) return;

  const incomingPoint = readPathPoint(path, incomingHandle.commandIndex, incomingHandle.pointIndex);
  const outgoingPoint = readPathPoint(path, outgoingHandle.commandIndex, outgoingHandle.pointIndex);
  const incomingOffset = incomingPoint.subtract(anchorPoint);
  const outgoingOffset = outgoingPoint.subtract(anchorPoint);
  const incomingDistance = Math.hypot(incomingOffset.x, incomingOffset.y);
  const outgoingDistance = Math.hypot(outgoingOffset.x, outgoingOffset.y);
  const defaultDistance = 56;

  const setHandlePoint = (
    handle: { commandIndex: number; pointIndex: number },
    point: Point,
  ) => {
    const command = path.path[handle.commandIndex];
    command[handle.pointIndex] = point.x;
    command[handle.pointIndex + 1] = point.y;
  };

  if (incomingDistance <= 0.001 && outgoingDistance <= 0.001) {
    setHandlePoint(outgoingHandle, new Point(anchorPoint.x + defaultDistance, anchorPoint.y));
    setHandlePoint(incomingHandle, new Point(anchorPoint.x - defaultDistance, anchorPoint.y));
  } else if (incomingDistance <= 0.001) {
    const sourceVector =
      outgoingDistance <= 0.001
        ? new Point(defaultDistance, 0)
        : new Point(
            (-outgoingOffset.x / outgoingDistance) * defaultDistance,
            (-outgoingOffset.y / outgoingDistance) * defaultDistance,
          );
    setHandlePoint(incomingHandle, anchorPoint.add(sourceVector));
  } else if (outgoingDistance <= 0.001) {
    const sourceVector =
      incomingDistance <= 0.001
        ? new Point(defaultDistance, 0)
        : new Point(
            (-incomingOffset.x / incomingDistance) * defaultDistance,
            (-incomingOffset.y / incomingDistance) * defaultDistance,
          );
    setHandlePoint(outgoingHandle, anchorPoint.add(sourceVector));
  }

  if (mode === "mirrored") {
    const nextOutgoingPoint = readPathPoint(path, outgoingHandle.commandIndex, outgoingHandle.pointIndex);
    const mirroredIncomingPoint = new Point(
      anchorPoint.x - (nextOutgoingPoint.x - anchorPoint.x),
      anchorPoint.y - (nextOutgoingPoint.y - anchorPoint.y),
    );
    setHandlePoint(incomingHandle, mirroredIncomingPoint);
  }

  syncClosedPathEndpoint(path, "c_0_M");
  refreshPathBounds(path, anchorCommandIndex === 0 ? { commandIndex: 0, pointIndex: 1 } : {
    commandIndex: anchorCommandIndex,
    pointIndex: getEndpointPointIndex(path.path[anchorCommandIndex]),
  });
}

/** Keeps the synthetic closing endpoint attached to the moved start anchor of a closed path. */
function syncClosedPathEndpoint(path: Path, controlKey: string) {
  if (controlKey !== "c_0_M") return;

  const closingCommandIndex = getClosingCommandIndex(path);
  const firstCommand = path.path[0];
  const closingCommand = closingCommandIndex === null ? null : path.path[closingCommandIndex];
  if (!firstCommand || firstCommand[0] !== "M" || !closingCommand) return;

  const endpointPointIndex = getEndpointPointIndex(closingCommand);
  closingCommand[endpointPointIndex] = Number(firstCommand[1]);
  closingCommand[endpointPointIndex + 1] = Number(firstCommand[2]);
}

/** Recomputes path bounds after point editing so the selection outline stays aligned. */
function refreshPathBounds(
  path: Path,
  anchorDescriptor: { commandIndex: number; pointIndex: number } | null,
) {
  const anchorPointInParentPlane = anchorDescriptor
    ? readPathPoint(path, anchorDescriptor.commandIndex, anchorDescriptor.pointIndex)
        .subtract(path.pathOffset)
        .transform(path.calcOwnMatrix())
    : null;

  path.setDimensions();
  if (anchorDescriptor && anchorPointInParentPlane) {
    const nextAnchorPointInParentPlane = readPathPoint(
      path,
      anchorDescriptor.commandIndex,
      anchorDescriptor.pointIndex,
    )
      .subtract(path.pathOffset)
      .transform(path.calcOwnMatrix());
    const diff = nextAnchorPointInParentPlane.subtract(anchorPointInParentPlane);
    path.left -= diff.x;
    path.top -= diff.y;
  }
  path.set({
    dirty: true,
  });
  path.setCoords();
  path.canvas?.requestRenderAll();
}

function setPathPointWithAnchorPreserved(
  path: Path,
  commandIndex: number,
  pointIndex: number,
  nextPoint: Point,
  anchorCommandIndex: number,
  anchorPointIndex: number,
) {
  const command = path.path[commandIndex];
  const anchorCommand = path.path[anchorCommandIndex];
  if (!command || !anchorCommand) return;

  const anchorPoint = new Point(
    Number(anchorCommand[anchorPointIndex]),
    Number(anchorCommand[anchorPointIndex + 1]),
  );
  const anchorPointInParentPlane = anchorPoint
    .subtract(path.pathOffset)
    .transform(path.calcOwnMatrix());

  command[pointIndex] = nextPoint.x;
  command[pointIndex + 1] = nextPoint.y;
  path.setDimensions();

  const nextAnchorPointInParentPlane = anchorPoint
    .subtract(path.pathOffset)
    .transform(path.calcOwnMatrix());
  const diff = nextAnchorPointInParentPlane.subtract(anchorPointInParentPlane);

  path.left -= diff.x;
  path.top -= diff.y;
  path.set("dirty", true);
  path.setCoords();
}

/** Applies the app's simplified selection styling to one Fabric object. */
function styleObjectControls(object: FabricObject) {
  const isPathEditMode = object instanceof Path && object.isPathEditing;
  const shouldUseDomHandles = usesDomTransformHandles(object);

  object.set({
    borderColor: shouldUseDomHandles ? "rgba(0,0,0,0)" : FIGMA_BLUE,
    borderScaleFactor: 1,
    borderOpacityWhenMoving: isPathEditMode ? 0 : 1,
    cornerColor: shouldUseDomHandles ? "rgba(0,0,0,0)" : "#ffffff",
    cornerStrokeColor: shouldUseDomHandles ? "rgba(0,0,0,0)" : FIGMA_BLUE,
    cornerStyle: "rect",
    cornerSize: 9,
    hasBorders: !isPathEditMode && !shouldUseDomHandles,
    lockMovementX: isPathEditMode,
    lockMovementY: isPathEditMode,
    transparentCorners: false,
    padding: SELECTION_PADDING,
  });
  syncEdgeControlSizes(object);
  syncPathControls(object);

  if (isPathEditMode) {
    object.setControlsVisibility({
      bl: false,
      br: false,
      mb: false,
      ml: false,
      mr: false,
      mt: false,
      mtr: false,
      tl: false,
      tr: false,
    });
    return;
  }

  if (shouldUseDomHandles) {
    object.setControlsVisibility({
      bl: false,
      br: false,
      mb: false,
      ml: false,
      mr: false,
      mt: false,
      mtr: false,
      tl: false,
      tr: false,
    });
    return;
  }

  if (object instanceof Line) {
    object.setControlsVisibility({
      bl: false,
      br: false,
      mb: false,
      ml: true,
      mr: true,
      mt: false,
      mtr: true,
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

/** Rebuilds the custom control set for a single object after local state changes. */
export function refreshObjectControls(object: FabricObject) {
  styleObjectControls(object);
  object.setCoords();
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
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    activeObject.set({
      borderScaleFactor,
    });
  }
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
    refreshObjectControls(object);
  });
  syncObjectControlBorderScale(canvas);

  canvas.on("object:added", ({ target }) => {
    if (!target) return;
    refreshObjectControls(target);
    target.set({
      borderScaleFactor: getZoomAwareBorderScaleFactor(canvas),
    });
  });

  canvas.on("object:modified", ({ target }) => {
    if (!target) return;
    syncEdgeControlSizes(target);
  });

  canvas.on("object:scaling", ({ target }) => {
    if (!target) return;
    syncEdgeControlSizes(target);
  });

  canvas.requestRenderAll();
}
