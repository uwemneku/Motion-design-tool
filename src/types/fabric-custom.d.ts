import "fabric";

declare module "fabric" {
  interface FabricObject {
    customId?: string;
  }
}

export {};
