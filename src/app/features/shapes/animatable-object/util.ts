import type { AnimatableProperties, Keyframe } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
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

export function findBoundingKeyframes<K extends keyof AnimatableProperties>(
  keyframes: Keyframe<K>[],
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
  keyframes: Keyframe[],
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
