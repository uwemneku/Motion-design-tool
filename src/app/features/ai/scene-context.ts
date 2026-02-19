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

  return {
    id,
    name,
    keyframeTimes,
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
        text:
          typeof instance.fabricObject.get('text') === 'string'
            ? String(instance.fabricObject.get('text'))
            : undefined,
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
