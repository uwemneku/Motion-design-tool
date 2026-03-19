/** Text Object.Ts shape model and behavior. */
import { Textbox } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty } from "../animatable-object/types";

export class TextObject extends AnimatableObject {
  override fabricObject: Textbox;

  constructor(
    text: string,
    options: ConstructorParameters<typeof Textbox>[1] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject = new Textbox(text, {
      textAlign: "center",
      fontFamily: "Inter",
      ...options,
    });
    super(fabricObject, keyframes);
    this.fabricObject = fabricObject;
  }
}
