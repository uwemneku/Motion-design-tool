/** Fabric Custom module implementation. */
import "fabric";
import type {} from // FabricObjectProps,
// ObjectEvents,
// TFabricObjectProps,
"fabric";

declare module "fabric" {
  type PathPointMode = "independent" | "mirrored" | "sharp";

  interface FabricObject {
    activePathAnchorCommandIndex?: number | null;
    customId?: string;
    isClosedPath?: boolean;
    isMaskSource?: boolean;
    isPathEditing?: boolean;
    pathPointModes?: Record<string, PathPointMode>;
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
    activePathAnchorCommandIndex?: number | null;
    customId?: string;
    isClosedPath?: boolean;
    isMaskSource?: boolean;
    isPathEditing?: boolean;
    pathPointModes?: Record<string, PathPointMode>;
  }
}

export {};
