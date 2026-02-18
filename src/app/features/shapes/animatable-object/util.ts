/** Util.Ts shape model and behavior. */
import type { Keyframe, KeyframeEasing } from './types';

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

export function applyEasing(progress: number, easing: KeyframeEasing) {
  const t = clamp(progress, 0, 1);
  if (easing === 'easeIn') return t * t * t;
  if (easing === 'easeOut') return 1 - Math.pow(1 - t, 3);
  if (easing === 'easeInOut') {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  if (easing === 'elastic') return easeOutElastic(t);
  if (easing === 'bounce') return easeOutBounce(t);
  return t;
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getNumeric(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
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

export function rgbaToCss(color: RgbaColor) {
  return `rgba(${clampColorChannel(color.r)}, ${clampColorChannel(color.g)}, ${clampColorChannel(color.b)}, ${clampAlpha(color.a).toFixed(3)})`;
}

export function interpolateColor(start: string, end: string, progress: number) {
  const startColor = parseColor(start);
  const endColor = parseColor(end);
  if (!startColor || !endColor) return progress >= 1 ? end : start;

  return rgbaToCss({
    r: lerp(startColor.r, endColor.r, progress),
    g: lerp(startColor.g, endColor.g, progress),
    b: lerp(startColor.b, endColor.b, progress),
    a: lerp(startColor.a, endColor.a, progress),
  });
}
