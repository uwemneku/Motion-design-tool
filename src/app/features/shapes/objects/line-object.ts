/** Line Object.Ts shape model and behavior. */
import { Line } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty } from "../animatable-object/types";

export class LineObject extends AnimatableObject {
  declare fabricObject: Line;

  constructor(
    points: ConstructorParameters<typeof Line>[0] = [0, 0, 140, 0],
    options: ConstructorParameters<typeof Line>[1] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject = new Line(points, {
      strokeUniform: true,
      ...options,
    });
    super(fabricObject, keyframes);
  }
}
