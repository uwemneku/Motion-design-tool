/** Object.Ts shape model and behavior. */
import type { FabricObject } from "fabric";
import type {
  AnimatableSnapshot,
  ColorAnimatableProperties,
  ColorKeyframe,
  ColorKeyframesByProperty,
  ColorSnapshot,
  ColorVector,
  KeyframesByProperty,
  KeyframeEasing,
  Keyframe,
  NumericAnimatableProperties,
  TimelineMarker,
} from "./types";
import {
  applyEasing,
  byTimeAsc,
  clamp,
  createId,
  findBoundingKeyframes,
  findInsertionIndex,
  hasKeyframeNearTime,
  cloneColorBytes,
  colorToRgbaBytes,
  getNumeric,
  getObjectAnimationPosition,
  interpolateColorBytes,
  lerp,
  rgbaBytesToCss,
  setObjectAnimationPosition,
} from "./util";

export class AnimatableObject {
  static animatableProperties: (keyof NumericAnimatableProperties)[] = [
    "left",
    "top",
    "width",
    "height",
    "borderRadius",
    "opacity",
    "angle",
    "strokeWidth",
  ];
  static colorAnimatableProperties: (keyof ColorAnimatableProperties)[] = [
    "fill",
    "stroke",
  ];

  fabricObject: FabricObject;
  keyframes: KeyframesByProperty;
  colorKeyframes: ColorKeyframesByProperty;

  constructor(
    fabricObject: FabricObject,
    keyframes: KeyframesByProperty = {},
    colorKeyframes: ColorKeyframesByProperty = {},
  ) {
    this.fabricObject = fabricObject;
    this.keyframes = normalizeNumericKeyframes(keyframes);
    this.colorKeyframes = normalizeColorKeyframes(colorKeyframes);

    const centerPoint = this.fabricObject.getCenterPoint();
    this.fabricObject.set({
      centeredRotation: true,
      originX: "center",
      originY: "center",
    });
    this.fabricObject.setPositionByOrigin(centerPoint, "center", "center");

    if (
      Object.keys(this.keyframes).length === 0 &&
      Object.keys(this.colorKeyframes).length === 0
    ) {
      this.freezeProperties(0);
    } else {
      this.seek(0);
    }
  }

  getSnapshot(): AnimatableSnapshot {
    const { left, top } = getObjectAnimationPosition(this.fabricObject);
    return {
      left,
      top,
      width: Math.max(1, this.fabricObject.getScaledWidth()),
      height: Math.max(1, this.fabricObject.getScaledHeight()),
      borderRadius: clamp(getNumeric(this.fabricObject.get("rx"), 0), 0, 9999),
      opacity: clamp(getNumeric(this.fabricObject.opacity, 1), 0, 1),
      angle: getNumeric(this.fabricObject.angle, 0),
      strokeWidth: clamp(getNumeric(this.fabricObject.strokeWidth, 0), 0, 9999),
    };
  }

  freezeProperties(time: number) {
    const snapshot = this.getSnapshot();
    this.addSnapshotKeyframe(time, snapshot);
    this.addColorSnapshotKeyframe(time, this.getColorSnapshot());
  }

  /** Clones the animatable object with fresh keyframe ids and an optional position offset. */
  async clone(positionOffset: { left: number; top: number } = { left: 0, top: 0 }) {
    const clonedFabricObject = await this.fabricObject.clone();
    if (typeof clonedFabricObject.left === "number") {
      clonedFabricObject.set("left", clonedFabricObject.left + positionOffset.left);
    }
    if (typeof clonedFabricObject.top === "number") {
      clonedFabricObject.set("top", clonedFabricObject.top + positionOffset.top);
    }
    clonedFabricObject.setCoords();

    return new AnimatableObject(
      clonedFabricObject,
      cloneAnimatableNumericKeyframes(this.keyframes, positionOffset),
      cloneAnimatableColorKeyframes(this.colorKeyframes),
    );
  }

  /** Re-bases stored position keyframes between canvas space and the current parent space. */
  rebasePositionKeyframes(direction: "toCanvas" | "toParent") {
    if (!this.fabricObject.group) return;

    const absolutePosition = this.fabricObject.getXY();
    const relativePosition = this.fabricObject.getRelativeXY();
    const offsetMultiplier = direction === "toParent" ? -1 : 1;
    const leftOffset =
      (absolutePosition.x - relativePosition.x) * offsetMultiplier;
    const topOffset =
      (absolutePosition.y - relativePosition.y) * offsetMultiplier;

    if (Math.abs(leftOffset) > 0.0001 && this.keyframes.left) {
      this.keyframes.left = this.keyframes.left.map((keyframe) => ({
        ...keyframe,
        value: keyframe.value + leftOffset,
      }));
    }

    if (Math.abs(topOffset) > 0.0001 && this.keyframes.top) {
      this.keyframes.top = this.keyframes.top.map((keyframe) => ({
        ...keyframe,
        value: keyframe.value + topOffset,
      }));
    }
  }

  addSnapshotKeyframe(time: number, snapshot: AnimatableSnapshot) {
    for (const property of AnimatableObject.animatableProperties) {
      this.addKeyframe({
        property,
        value: snapshot[property],
        time,
        easing: "linear",
      });
    }
  }

  addKeyframe<K extends keyof NumericAnimatableProperties>(
    keyframe: Omit<Keyframe<K>, "id" | "easing"> & { easing?: KeyframeEasing },
  ) {
    const propertyKeyframes = (this.keyframes[keyframe.property] ??
      []) as Keyframe[];
    const [insertIndex, shouldReplace] = findInsertionIndex(
      propertyKeyframes,
      keyframe.time,
    );
    const nextKeyframe: Keyframe = {
      ...keyframe,
      easing: keyframe.easing ?? "linear",
      id: createId("kf"),
    };

    propertyKeyframes.splice(insertIndex, shouldReplace ? 1 : 0, nextKeyframe);
    this.keyframes[keyframe.property] = propertyKeyframes;

    return nextKeyframe.id;
  }

  getColorSnapshot(): ColorSnapshot {
    const fill = this.fabricObject.get("fill");
    const stroke = this.fabricObject.get("stroke");

    return {
      ...(typeof fill === "string" && fill.length > 0 ? { fill } : {}),
      ...(typeof stroke === "string" && stroke.length > 0 ? { stroke } : {}),
    };
  }

  addColorSnapshotKeyframe(time: number, snapshot: ColorSnapshot) {
    for (const property of AnimatableObject.colorAnimatableProperties) {
      const value = snapshot[property];
      if (typeof value !== "string" || value.length === 0) continue;
      this.addColorKeyframe({
        property,
        value,
        time,
        easing: "linear",
      });
    }
  }

  addColorKeyframe<K extends keyof ColorAnimatableProperties>(
    keyframe: Omit<ColorKeyframe<K>, "id" | "easing" | "value"> & {
      value: ColorAnimatableProperties[K] | ColorVector;
      easing?: KeyframeEasing;
    },
  ) {
    const propertyKeyframes = (this.colorKeyframes[keyframe.property] ??
      []) as ColorKeyframe[];
    const colorValue =
      typeof keyframe.value === "string"
        ? colorToRgbaBytes(keyframe.value)
        : cloneColorBytes(keyframe.value);
    if (!colorValue) return null;
    const [insertIndex, shouldReplace] = findInsertionIndex(
      propertyKeyframes,
      keyframe.time,
    );
    const nextKeyframe: ColorKeyframe = {
      ...keyframe,
      easing: keyframe.easing ?? "linear",
      id: createId("ckf"),
      value: colorValue,
    };

    propertyKeyframes.splice(insertIndex, shouldReplace ? 1 : 0, nextKeyframe);
    this.colorKeyframes[keyframe.property] = propertyKeyframes;

    return nextKeyframe.id;
  }

  deleteKeyframeAtTime(time: number, epsilon = 0.02) {
    for (const property of AnimatableObject.animatableProperties) {
      const propertyKeyframes = this.keyframes[property];
      if (!propertyKeyframes) continue;

      this.keyframes[property] = propertyKeyframes.filter(
        (keyframe) => Math.abs(keyframe.time - time) > epsilon,
      ) as KeyframesByProperty[typeof property];

      if (this.keyframes[property]?.length === 0) {
        delete this.keyframes[property];
      }
    }

    for (const property of AnimatableObject.colorAnimatableProperties) {
      const propertyKeyframes = this.colorKeyframes[property];
      if (!propertyKeyframes) continue;

      this.colorKeyframes[property] = propertyKeyframes.filter(
        (keyframe) => Math.abs(keyframe.time - time) > epsilon,
      ) as ColorKeyframesByProperty[typeof property];

      if (this.colorKeyframes[property]?.length === 0) {
        delete this.colorKeyframes[property];
      }
    }
  }

  seek(time: number) {
    for (const property of AnimatableObject.animatableProperties) {
      const propertyKeyframes = this.keyframes[property];
      if (!propertyKeyframes || propertyKeyframes.length === 0) continue;

      const { previous, next } = findBoundingKeyframes(propertyKeyframes, time);
      if (!previous || !next) continue;

      if (
        previous.id === next.id ||
        Math.abs(next.time - previous.time) < 0.0001
      ) {
        this.updateProperty(property, previous.value);
        continue;
      }

      const progress = clamp(
        (time - previous.time) / (next.time - previous.time),
        0,
        1,
      );
      const easedProgress = applyEasing(progress, next.easing);
      const value = lerp(
        previous.value as number,
        next.value as number,
        easedProgress,
      ) as NumericAnimatableProperties[typeof property];

      this.updateProperty(property, value);
    }

    for (const property of AnimatableObject.colorAnimatableProperties) {
      const propertyKeyframes = this.colorKeyframes[property];
      if (!propertyKeyframes || propertyKeyframes.length === 0) continue;

      const { previous, next } = findBoundingKeyframes(propertyKeyframes, time);
      if (!previous || !next) continue;

      if (
        previous.id === next.id ||
        Math.abs(next.time - previous.time) < 0.0001
      ) {
        this.updateColorProperty(property, rgbaBytesToCss(previous.value));
        continue;
      }

      const progress = clamp(
        (time - previous.time) / (next.time - previous.time),
        0,
        1,
      );
      this.updateColorProperty(
        property,
        interpolateColorBytes(
          previous.value,
          next.value,
          applyEasing(progress, next.easing),
        ),
      );
    }

    this.fabricObject.setCoords();
    if (this.fabricObject.isMaskSource) {
      this.fabricObject.fire("my:mask-source:seek", {
        target: this.fabricObject,
      });
    }
  }

  getTimelineMarkers(): TimelineMarker[] {
    const map = new Map<string, TimelineMarker>();

    for (const property of AnimatableObject.animatableProperties) {
      const propertyKeyframes = this.keyframes[property];
      if (!propertyKeyframes) continue;

      for (const keyframe of propertyKeyframes) {
        const key = keyframe.time.toFixed(4);
        if (map.has(key)) continue;
        map.set(key, {
          id: keyframe.id,
          time: keyframe.time,
        });
      }
    }

    for (const property of AnimatableObject.colorAnimatableProperties) {
      const propertyKeyframes = this.colorKeyframes[property];
      if (!propertyKeyframes) continue;

      for (const keyframe of propertyKeyframes) {
        const key = keyframe.time.toFixed(4);
        if (map.has(key)) continue;
        map.set(key, {
          id: keyframe.id,
          time: keyframe.time,
        });
      }
    }

    return Array.from(map.values()).sort(byTimeAsc);
  }

  hasAnyKeyframeAtTime(time: number, epsilon = 0.02) {
    for (const property of AnimatableObject.animatableProperties) {
      const propertyKeyframes = this.keyframes[property];
      if (!propertyKeyframes) continue;
      if (hasKeyframeNearTime(propertyKeyframes, time, epsilon)) return true;
    }
    for (const property of AnimatableObject.colorAnimatableProperties) {
      const propertyKeyframes = this.colorKeyframes[property];
      if (!propertyKeyframes) continue;
      if (hasKeyframeNearTime(propertyKeyframes, time, epsilon)) return true;
    }
    return false;
  }

  private updateProperty<K extends keyof NumericAnimatableProperties>(
    property: K,
    value: NumericAnimatableProperties[K],
  ) {
    if (property === "left" || property === "top") {
      setObjectAnimationPosition(this.fabricObject, property, value as number);
      return;
    }
    if (property === "width") {
      const currentWidth = this.fabricObject.getScaledWidth();
      const currentScaleX = this.fabricObject.scaleX ?? 1;
      if (currentWidth > 0) {
        this.fabricObject.set(
          "scaleX",
          currentScaleX * ((value as number) / currentWidth),
        );
      }
      return;
    }
    if (property === "height") {
      const currentHeight = this.fabricObject.getScaledHeight();
      const currentScaleY = this.fabricObject.scaleY ?? 1;
      if (currentHeight > 0) {
        this.fabricObject.set(
          "scaleY",
          currentScaleY * ((value as number) / currentHeight),
        );
      }
      return;
    }
    if (property === "borderRadius") {
      this.fabricObject.set({
        rx: value as number,
        ry: value as number,
      });
      return;
    }
    this.fabricObject.set(property, value as number);
  }

  private updateColorProperty<K extends keyof ColorAnimatableProperties>(
    property: K,
    value: ColorAnimatableProperties[K],
  ) {
    this.fabricObject.set(property, value);
  }
}

/** Clones numeric keyframes with fresh ids and an optional position offset. */
export function cloneAnimatableNumericKeyframes(
  keyframes: KeyframesByProperty,
  positionOffset: { left: number; top: number },
) {
  const nextKeyframes: KeyframesByProperty = {};

  Object.entries(keyframes).forEach(([property, propertyKeyframes]) => {
    if (!propertyKeyframes || propertyKeyframes.length === 0) return;

    nextKeyframes[property as keyof KeyframesByProperty] = propertyKeyframes.map((keyframe) => ({
      ...keyframe,
      id: createId("kf"),
      value:
        property === "left"
          ? keyframe.value + positionOffset.left
          : property === "top"
            ? keyframe.value + positionOffset.top
            : keyframe.value,
    }));
  });

  return nextKeyframes;
}

/** Clones color keyframes with fresh ids so duplicate objects do not share vectors. */
export function cloneAnimatableColorKeyframes(colorKeyframes: ColorKeyframesByProperty) {
  const nextKeyframes: ColorKeyframesByProperty = {};

  Object.entries(colorKeyframes).forEach(([property, propertyKeyframes]) => {
    if (!propertyKeyframes || propertyKeyframes.length === 0) return;

    nextKeyframes[property as keyof ColorKeyframesByProperty] = propertyKeyframes.map((keyframe) => ({
      ...keyframe,
      id: createId("ckf"),
      value: cloneColorBytes(keyframe.value),
    }));
  });

  return nextKeyframes;
}

/** Drops invalid loaded numeric keyframes and enforces time ordering once at hydration. */
function normalizeNumericKeyframes(keyframes: KeyframesByProperty) {
  const nextKeyframes: KeyframesByProperty = {};

  for (const property of Object.keys(keyframes) as Array<
    keyof KeyframesByProperty
  >) {
    const frames = keyframes[property];
    if (!frames) continue;

    const normalizedFrames = frames
      .filter((frame) => Number.isFinite(frame.time))
      .sort(byTimeAsc);

    if (normalizedFrames.length > 0) {
      nextKeyframes[property] = normalizedFrames;
    }
  }

  return nextKeyframes;
}

/** Converts loaded color keyframes into cloned RGBA byte vectors. */
function normalizeColorKeyframes(keyframes: ColorKeyframesByProperty) {
  const nextKeyframes: ColorKeyframesByProperty = {};

  for (const property of Object.keys(keyframes) as Array<
    keyof ColorKeyframesByProperty
  >) {
    const frames = keyframes[property];
    if (!frames) continue;

    const normalizedFrames = frames.flatMap((frame) => {
      if (!Number.isFinite(frame.time)) return [];
      const value =
        typeof frame.value === "string"
          ? colorToRgbaBytes(frame.value)
          : cloneColorBytes(frame.value);
      if (!value) return [];
      return [{ ...frame, value }];
    }).sort(byTimeAsc);

    if (normalizedFrames.length > 0) {
      nextKeyframes[property] = normalizedFrames;
    }
  }

  return nextKeyframes;
}
