import { Circle } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty } from "../animatable-object/types";

export class CircleObject extends AnimatableObject {
  declare fabricObject: Circle;

  constructor(
    options: ConstructorParameters<typeof Circle>[0] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject = new Circle(options);
    super(fabricObject, keyframes);
  }
}
