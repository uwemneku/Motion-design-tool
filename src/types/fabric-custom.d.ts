/** Fabric Custom module implementation. */
import "fabric";
import type {} from // FabricObjectProps,
// ObjectEvents,
// TFabricObjectProps,
"fabric";

declare module "fabric" {
  interface FabricObject {
    customId?: string;
    isMaskSource?: boolean;
    isPathEditing?: boolean;
  }

  interface ObjectEvents {
    "my:mask-source:seek": {
      target: FabricObject;
    };
    "my:custom:seek": {
      target: FabricObject;
    };
  }

  interface SerializedObjectProps {
    customId?: string;
    isMaskSource?: boolean;
    isPathEditing?: boolean;
  }
}

export {};
