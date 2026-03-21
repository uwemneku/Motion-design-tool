/** Util.Ts shape model and behavior. */
import { Point, type FabricObject } from "fabric";

import type { ColorVector, Keyframe, KeyframeEasing } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutBounce(progress: number) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (progress < 1 / d1) {
    return n1 * progress * progress;
  }
  if (progress < 2 / d1) {
    const shifted = progress - 1.5 / d1;
    return n1 * shifted * shifted + 0.75;
  }
  if (progress < 2.5 / d1) {
    const shifted = progress - 2.25 / d1;
    return n1 * shifted * shifted + 0.9375;
  }
  const shifted = progress - 2.625 / d1;
  return n1 * shifted * shifted + 0.984375;
}

function easeOutElastic(progress: number) {
  if (progress === 0) return 0;
  if (progress === 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
}

function cubicBezier(progress: number, x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  let t = progress;
  for (let index = 0; index < 8; index += 1) {
    const x = sampleCurveX(t) - progress;
    const derivative = sampleDerivativeX(t);
    if (Math.abs(x) < 1e-6 || Math.abs(derivative) < 1e-6) break;
    t -= x / derivative;
  }

  let lower = 0;
  let upper = 1;
  while (sampleCurveX(t) > progress) {
    upper = t;
    t = (lower + upper) / 2;
  }
  while (sampleCurveX(t) < progress) {
    lower = t;
    t = (lower + upper) / 2;
    if (upper - lower < 1e-6) break;
  }

  return sampleCurveY(t);
}

export function applyEasing(progress: number, easing: KeyframeEasing) {
  const t = clamp(progress, 0, 1);
  if (easing === "step") return t < 1 ? 0 : 1;
  if (easing === "easeIn") return t * t * t;
  if (easing === "easeOut") return 1 - Math.pow(1 - t, 3);
  if (easing === "easeInOut") {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  if (easing === "naturalness") return cubicBezier(t, 0.4, 0, 0.8, 1);
  if (easing === "elastic") return easeOutElastic(t);
  if (easing === "bounce") return easeOutBounce(t);
  return t;
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getNumeric(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

/** Reads object position in the same coordinate space used by grouped keyframes. */
export function getObjectAnimationPosition(object: FabricObject) {
  const position = object.group ? object.getRelativeXY() : object.getXY();
  return {
    left: getNumeric(position.x, 0),
    top: getNumeric(position.y, 0),
  };
}

/** Writes object position in parent-relative space for grouped children. */
export function setObjectAnimationPosition(
  object: FabricObject,
  property: "left" | "top",
  value: number,
) {
  const current = object.group ? object.getRelativeXY() : object.getXY();
  const nextPoint =
    property === "left" ? new Point(value, current.y) : new Point(current.x, value);

  if (object.group) {
    object.setRelativeXY(nextPoint);
    return;
  }

  object.setXY(nextPoint);
}

export function byTimeAsc(a: { time: number }, b: { time: number }) {
  return a.time - b.time;
}

export function findInsertionIndex<T extends { time: number }>(
  list: T[],
  time: number,
  epsilon = 0.0001,
): [number, boolean] {
  let low = 0;
  let high = list.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const current = list[mid];
    const delta = current.time - time;

    if (Math.abs(delta) <= epsilon) return [mid, true];
    if (delta < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return [low, false];
}

export function findBoundingKeyframes<T extends { time: number }>(
  keyframes: T[],
  time: number,
) {
  if (keyframes.length === 0) return { previous: null, next: null } as const;

  if (time <= keyframes[0].time) {
    return { previous: keyframes[0], next: keyframes[0] } as const;
  }

  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) {
    return { previous: last, next: last } as const;
  }

  let low = 1;
  let high = keyframes.length - 1;
  let nextIndex = keyframes.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (time <= keyframes[mid].time) {
      nextIndex = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return {
    previous: keyframes[nextIndex - 1],
    next: keyframes[nextIndex],
  } as const;
}

export function hasKeyframeNearTime(
  keyframes: Keyframe[] | Array<{ time: number }>,
  time: number,
  epsilon = 0.02,
) {
  if (keyframes.length === 0) return false;

  const [index, exact] = findInsertionIndex(keyframes, time, epsilon);
  if (exact) return true;

  const left = keyframes[index - 1];
  if (left && Math.abs(left.time - time) <= epsilon) return true;

  const right = keyframes[index];
  if (right && Math.abs(right.time - time) <= epsilon) return true;

  return false;
}

type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const colorParserCanvas =
  typeof document !== "undefined" ? document.createElement("canvas") : null;
const colorParserContext = colorParserCanvas?.getContext("2d") ?? null;

function clampColorChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseRgbText(text: string): RgbaColor | null {
  const rgbMatch = text.match(
    /^rgba?\(\s*([+-]?\d*\.?\d+)[,\s]+([+-]?\d*\.?\d+)[,\s]+([+-]?\d*\.?\d+)(?:[,\s/]+([+-]?\d*\.?\d+))?\s*\)$/i,
  );
  if (!rgbMatch) return null;

  const r = Number(rgbMatch[1]);
  const g = Number(rgbMatch[2]);
  const b = Number(rgbMatch[3]);
  const a = rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]);

  if (![r, g, b, a].every(Number.isFinite)) return null;

  return {
    r: clampColorChannel(r),
    g: clampColorChannel(g),
    b: clampColorChannel(b),
    a: clampAlpha(a),
  };
}

function parseHexText(text: string): RgbaColor | null {
  const hex = text.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(hex.length)) return null;
  if (!/^[\da-f]+$/i.test(hex)) return null;

  const expand = (value: string) => (value.length === 1 ? `${value}${value}` : value);
  const toByte = (value: string) => Number.parseInt(expand(value), 16);

  if (hex.length === 3 || hex.length === 4) {
    const r = toByte(hex[0]);
    const g = toByte(hex[1]);
    const b = toByte(hex[2]);
    const a = hex.length === 4 ? toByte(hex[3]) / 255 : 1;
    return { r, g, b, a };
  }

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function parseColor(value: string): RgbaColor | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hex = parseHexText(trimmed);
  if (hex) return hex;

  const rgb = parseRgbText(trimmed);
  if (rgb) return rgb;

  if (!colorParserContext) return null;
  colorParserContext.fillStyle = "#000";
  colorParserContext.fillStyle = trimmed;
  const normalized = colorParserContext.fillStyle;
  return parseHexText(normalized) ?? parseRgbText(normalized);
}

/** Converts a CSS color string into a 4-byte RGBA vector. */
export function colorToRgbaBytes(value: string): ColorVector | null {
  const parsed = parseColor(value);
  if (!parsed) return null;
  return new Uint8Array([
    clampColorChannel(parsed.r),
    clampColorChannel(parsed.g),
    clampColorChannel(parsed.b),
    clampColorChannel(parsed.a * 255),
  ]);
}

/** Clones an RGBA byte vector so keyframes do not share mutable references. */
export function cloneColorBytes(value: ColorVector) {
  return new Uint8Array(value);
}

/** Converts an RGBA byte vector into a CSS rgba(...) string. */
export function rgbaBytesToCss(color: ColorVector) {
  return rgbaToCss({
    r: color[0] ?? 0,
    g: color[1] ?? 0,
    b: color[2] ?? 0,
    a: (color[3] ?? 255) / 255,
  });
}

export function rgbaToCss(color: RgbaColor) {
  return `rgba(${clampColorChannel(color.r)}, ${clampColorChannel(color.g)}, ${clampColorChannel(color.b)}, ${clampAlpha(color.a).toFixed(3)})`;
}

/** Interpolates two RGBA byte vectors and returns a CSS rgba(...) string. */
export function interpolateColorBytes(
  start: ColorVector,
  end: ColorVector,
  progress: number,
) {
  return rgbaToCss({
    r: lerp(start[0] ?? 0, end[0] ?? 0, progress),
    g: lerp(start[1] ?? 0, end[1] ?? 0, progress),
    b: lerp(start[2] ?? 0, end[2] ?? 0, progress),
    a: lerp((start[3] ?? 255) / 255, (end[3] ?? 255) / 255, progress),
  });
}
