import type { FabricObject } from "fabric";
import type {
  AnimatableProperties,
  AnimatableSnapshot,
  KeyframesByProperty,
  Keyframe,
  TimelineMarker,
} from "./types";
import {
  byTimeAsc,
  clamp,
  createId,
  findBoundingKeyframes,
  findInsertionIndex,
  hasKeyframeNearTime,
  getNumeric,
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

  fabricObject: FabricObject;
  keyframes: KeyframesByProperty;

  constructor(fabricObject: FabricObject, keyframes: KeyframesByProperty = {}) {
    this.fabricObject = fabricObject;
    this.keyframes = keyframes;

    if (Object.keys(this.keyframes).length === 0) {
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

  addKeyframe<K extends keyof AnimatableProperties>(keyframe: Omit<Keyframe<K>, "id">) {
    const propertyKeyframes = (this.keyframes[keyframe.property] ?? []) as Keyframe[];
    const [insertIndex, shouldReplace] = findInsertionIndex(
      propertyKeyframes,
      keyframe.time,
    );
    const nextKeyframe: Keyframe = { ...keyframe, id: createId("kf") };

    propertyKeyframes.splice(insertIndex, shouldReplace ? 1 : 0, nextKeyframe);
    this.keyframes[keyframe.property] = propertyKeyframes;

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
      const value = lerp(
        previous.value as number,
        next.value as number,
        progress,
      ) as AnimatableProperties[typeof property];

      this.updateProperty(property, value);
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

    return Array.from(map.values()).sort(byTimeAsc);
  }

  hasAnyKeyframeAtTime(time: number, epsilon = 0.02) {
    for (const property of AnimatableObject.animatableProperties) {
      const propertyKeyframes = this.keyframes[property];
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
}
