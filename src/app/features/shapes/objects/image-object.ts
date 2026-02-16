import { FabricImage } from "fabric";
import { AnimatableObject } from "../animatable-object/object";
import type { KeyframesByProperty } from "../animatable-object/types";

export class ImageObject extends AnimatableObject {
  declare fabricObject: FabricImage;

  constructor(
    source: FabricImage | ConstructorParameters<typeof FabricImage>[0],
    options: ConstructorParameters<typeof FabricImage>[1] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject =
      source instanceof FabricImage ? source : new FabricImage(source, options);
    super(fabricObject, keyframes);
  }

  static async fromURL(
    url: string,
    loadOptions: Parameters<typeof FabricImage.fromURL>[1] = {},
    imageOptions: Parameters<typeof FabricImage.fromURL>[2] = {},
    keyframes: KeyframesByProperty = {},
  ) {
    const fabricObject = await FabricImage.fromURL(url, loadOptions, imageOptions);
    return new ImageObject(fabricObject, {}, keyframes);
  }
}
