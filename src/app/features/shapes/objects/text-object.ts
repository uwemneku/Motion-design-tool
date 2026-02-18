import { Textbox } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty } from "../animatable-object/types";

export class TextObject extends AnimatableObject {
  declare fabricObject: Textbox;

  constructor(
    text: string,
    options: ConstructorParameters<typeof Textbox>[1] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject = new Textbox(text, {
      textAlign: 'center',
      ...options,
    });
    super(fabricObject, keyframes);
  }
}
