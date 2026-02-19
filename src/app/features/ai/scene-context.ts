/** Scene Context.Ts helpers for building AI scene context from canvas state. */
import type {
  ColorKeyframe,
  Keyframe,
} from '../shapes/animatable-object/types';

type CanvasItemInstanceLike = {
  colorKeyframes: {
    fill?: ColorKeyframe[];
    stroke?: ColorKeyframe[];
  };
  fabricObject: {
    get: (key: string) => unknown;
    getScaledHeight: () => number;
    getScaledWidth: () => number;
    height?: number;
    width?: number;
  };
  getColorSnapshot: () => {
    fill?: string;
    stroke?: string;
  };
  getSnapshot: () => {
    angle: number;
    left: number;
    opacity: number;
    scaleX: number;
    scaleY: number;
    top: number;
  };
  keyframes: {
    angle?: Keyframe[];
    left?: Keyframe[];
    opacity?: Keyframe[];
    scaleX?: Keyframe[];
    scaleY?: Keyframe[];
    top?: Keyframe[];
  };
};

/** Maps numeric keyframes to a compact JSON-safe structure. */
function mapNumericFrames(frames: Keyframe[] | undefined) {
  return (frames ?? []).map((frame) => ({
    id: frame.id,
    time: frame.time,
    value: frame.value,
  }));
}

/** Maps color keyframes to a compact JSON-safe structure. */
function mapColorFrames(frames: ColorKeyframe[] | undefined) {
  return (frames ?? []).map((frame) => ({
    id: frame.id,
    time: frame.time,
    value: frame.value,
  }));
}

/** Builds one AI scene item payload from canvas instance data. */
export function buildSceneItemContext(
  id: string,
  name: string,
  keyframeTimes: number[],
  instance?: CanvasItemInstanceLike,
) {
  if (!instance) {
    return { id, name, keyframeTimes };
  }

  const textValue =
    typeof instance.fabricObject.get('text') === 'string'
      ? String(instance.fabricObject.get('text'))
      : undefined;

  return {
    id,
    name,
    keyframeTimes,
    ...(textValue ? { text: textValue } : {}),
    current: (() => {
      const snapshot = instance.getSnapshot();
      const width =
        typeof instance.fabricObject.width === 'number'
          ? instance.fabricObject.width
          : undefined;
      const height =
        typeof instance.fabricObject.height === 'number'
          ? instance.fabricObject.height
          : undefined;
      const scaledWidth = instance.fabricObject.getScaledWidth();
      const scaledHeight = instance.fabricObject.getScaledHeight();
      const halfWidth = scaledWidth / 2;
      const halfHeight = scaledHeight / 2;

      return {
        ...snapshot,
        bounds: {
          bottom: snapshot.top + halfHeight,
          left: snapshot.left - halfWidth,
          right: snapshot.left + halfWidth,
          top: snapshot.top - halfHeight,
        },
        centerX: snapshot.left,
        centerY: snapshot.top,
        ...instance.getColorSnapshot(),
        fontFamily:
          typeof instance.fabricObject.get('fontFamily') === 'string'
            ? String(instance.fabricObject.get('fontFamily'))
            : undefined,
        fontSize:
          typeof instance.fabricObject.get('fontSize') === 'number'
            ? Number(instance.fabricObject.get('fontSize'))
            : undefined,
        height,
        scaledHeight,
        scaledWidth,
        text: textValue,
        width,
      };
    })(),
    keyframes: {
      angle: mapNumericFrames(instance.keyframes.angle),
      fill: mapColorFrames(instance.colorKeyframes.fill),
      left: mapNumericFrames(instance.keyframes.left),
      opacity: mapNumericFrames(instance.keyframes.opacity),
      scaleX: mapNumericFrames(instance.keyframes.scaleX),
      scaleY: mapNumericFrames(instance.keyframes.scaleY),
      stroke: mapColorFrames(instance.colorKeyframes.stroke),
      top: mapNumericFrames(instance.keyframes.top),
    },
  };
}

/** Builds a reduced AI scene item payload focused on planning-critical fields. */
export function buildCompactSceneItemContext(
  id: string,
  name: string,
  keyframeTimes: number[],
  instance?: CanvasItemInstanceLike,
) {
  const item = buildSceneItemContext(id, name, keyframeTimes, instance);
  if (!('current' in item) || !item.current) {
    return item;
  }

  return {
    id: item.id,
    keyframeTimes: item.keyframeTimes,
    keyframes: item.keyframes,
    name: item.name,
    ...(item.text ? { text: item.text } : {}),
    current: {
      angle: item.current.angle,
      ...(item.current.bounds ? { bounds: item.current.bounds } : {}),
      ...(typeof item.current.fill === 'string' ? { fill: item.current.fill } : {}),
      ...(typeof item.current.height === 'number' ? { height: item.current.height } : {}),
      left: item.current.left,
      opacity: item.current.opacity,
      scaleX: item.current.scaleX,
      scaleY: item.current.scaleY,
      ...(typeof item.current.scaledHeight === 'number'
        ? { scaledHeight: item.current.scaledHeight }
        : {}),
      ...(typeof item.current.scaledWidth === 'number'
        ? { scaledWidth: item.current.scaledWidth }
        : {}),
      ...(typeof item.current.stroke === 'string' ? { stroke: item.current.stroke } : {}),
      ...(typeof item.current.text === 'string' ? { text: item.current.text } : {}),
      top: item.current.top,
      ...(typeof item.current.width === 'number' ? { width: item.current.width } : {}),
    },
  };
}
