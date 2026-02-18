/** Rectangle Object.Ts shape model and behavior. */
import { Rect } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty } from "../animatable-object/types";

export class RectangleObject extends AnimatableObject {
  declare fabricObject: Rect;

  constructor(
    options: ConstructorParameters<typeof Rect>[0] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject = new Rect({
      strokeUniform: true,
      ...options,
    });
    super(fabricObject, keyframes);
  }
}
