/** Polygon Object.Ts shape model and behavior. */
import { Polygon, type XY } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty } from "../animatable-object/types";

export class PolygonObject extends AnimatableObject {
  override fabricObject: Polygon;

  constructor(
    points: XY[] = [],
    options: ConstructorParameters<typeof Polygon>[1] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject = new Polygon(points, {
      strokeUniform: true,
      ...options,
    });
    super(fabricObject, keyframes);
    this.fabricObject = fabricObject;
  }
}
