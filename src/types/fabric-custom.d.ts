/** Fabric Custom module implementation. */
import "fabric";
import type {} from // FabricObjectProps,
// ObjectEvents,
// TFabricObjectProps,
"fabric";

declare module "fabric" {
  interface FabricObject {
    customId?: string;
  }

  interface ObjectEvents {
    "my:custom:seek": {
      target: FabricObject;
    };
  }

  interface SerializedObjectProps {
    customId?: string;
  }
}

export {};
