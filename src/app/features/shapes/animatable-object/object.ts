/** Object.Ts shape model and behavior. */
import type { FabricObject } from "fabric";
import type {
  AnimatableProperties,
  AnimatableSnapshot,
  ColorAnimatableProperties,
  ColorKeyframe,
  ColorKeyframesByProperty,
  ColorSnapshot,
  KeyframesByProperty,
  KeyframeEasing,
  Keyframe,
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
  getNumeric,
  interpolateColor,
  lerp,
} from "./util";

export class AnimatableObject {
  static animatableProperties: (keyof AnimatableProperties)[] = [
    "left",
    "top",
    "scaleX",
    "scaleY",
    "opacity",
    "angle",
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
    this.keyframes = keyframes;
    this.colorKeyframes = colorKeyframes;

    const centerPoint = this.fabricObject.getCenterPoint();
    this.fabricObject.set({
      centeredRotation: true,
      originX: 'center',
      originY: 'center',
    });
    this.fabricObject.setPositionByOrigin(centerPoint, 'center', 'center');

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
    return {
      left: getNumeric(this.fabricObject.left, 0),
      top: getNumeric(this.fabricObject.top, 0),
      scaleX: getNumeric(this.fabricObject.scaleX, 1),
      scaleY: getNumeric(this.fabricObject.scaleY, 1),
      opacity: clamp(getNumeric(this.fabricObject.opacity, 1), 0, 1),
      angle: getNumeric(this.fabricObject.angle, 0),
    };
  }

  freezeProperties(time: number) {
    const snapshot = this.getSnapshot();
    this.addSnapshotKeyframe(time, snapshot);
    this.addColorSnapshotKeyframe(time, this.getColorSnapshot());
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

  addKeyframe<K extends keyof AnimatableProperties>(
    keyframe: Omit<Keyframe<K>, 'id' | 'easing'> & { easing?: KeyframeEasing },
  ) {
    const propertyKeyframes = (this.keyframes[keyframe.property] ?? []) as Keyframe[];
    const [insertIndex, shouldReplace] = findInsertionIndex(
      propertyKeyframes,
      keyframe.time,
    );
    const nextKeyframe: Keyframe = {
      ...keyframe,
      easing: keyframe.easing ?? 'linear',
      id: createId('kf'),
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
    keyframe: Omit<ColorKeyframe<K>, 'id' | 'easing'> & { easing?: KeyframeEasing },
  ) {
    const propertyKeyframes = (this.colorKeyframes[keyframe.property] ??
      []) as ColorKeyframe[];
    const [insertIndex, shouldReplace] = findInsertionIndex(
      propertyKeyframes,
      keyframe.time,
    );
    const nextKeyframe: ColorKeyframe = {
      ...keyframe,
      easing: keyframe.easing ?? 'linear',
      id: createId('ckf'),
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
      ) as AnimatableProperties[typeof property];

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
        this.updateColorProperty(property, previous.value);
        continue;
      }

      const progress = clamp(
        (time - previous.time) / (next.time - previous.time),
        0,
        1,
      );
      this.updateColorProperty(
        property,
        interpolateColor(
          previous.value,
          next.value,
          applyEasing(progress, next.easing),
        ),
      );
    }

    this.fabricObject.setCoords();
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

  private updateProperty<K extends keyof AnimatableProperties>(
    property: K,
    value: AnimatableProperties[K],
  ) {
    this.fabricObject.set(property, value as number);
  }

  private updateColorProperty<K extends keyof ColorAnimatableProperties>(
    property: K,
    value: ColorAnimatableProperties[K],
  ) {
    this.fabricObject.set(property, value);
  }
}
