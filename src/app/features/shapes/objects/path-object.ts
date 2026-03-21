/** Path Object.Ts shape model and behavior. */
import { Path } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty, PathKeyframesByProperty } from "../animatable-object/types";

export class PathObject extends AnimatableObject {
  override fabricObject: Path;

  constructor(
    path: ConstructorParameters<typeof Path>[0],
    options: ConstructorParameters<typeof Path>[1] = {},
    keyframes: KeyframesByProperty = {},
    pathKeyframes: PathKeyframesByProperty = {},
  ) {
    const fabricObject = new Path(path, {
      objectCaching: false,
      strokeUniform: true,
      ...options,
    });
    super(fabricObject, keyframes, {}, pathKeyframes);
    this.fabricObject = fabricObject;
  }
}
