/** Masking Util.Ts module implementation. */
import { MASK_SYNC_EVENTS, NONE_MASK_SOURCE_ID } from "../../../../const";
import type { AnimatableObject } from "../../shapes/animatable-object/object";

type MaskSyncContainer = {
  __maskSyncCleanup?: () => void;
  __maskProxyObject?: AnimatableObject["fabricObject"];
  __maskSourceObject?: AnimatableObject["fabricObject"];
};

export function readMaskSourceId(instance?: AnimatableObject): string {
  // Resolve the currently assigned mask source id from the clipPath metadata.
  if (!instance) return NONE_MASK_SOURCE_ID;

  const clipPath = instance.fabricObject.clipPath;
  if (!clipPath) return NONE_MASK_SOURCE_ID;

  const sourceId =
    "customId" in clipPath &&
    typeof (clipPath as { customId?: unknown }).customId === "string"
      ? (clipPath as { customId: string }).customId
      : undefined;
  if (sourceId && sourceId.length > 0) return sourceId;

  return NONE_MASK_SOURCE_ID;
}

export async function setMaskSourceForInstance(
  target: AnimatableObject,
  source?: AnimatableObject,
) {
  // Apply or clear an object's mask using a synced proxy so source remains visible.
  if (!source || source === target) {
    clearMaskFromObject(target);
    return;
  }
  await applyMaskFromCanvasObject(target, source);
}

function clearMaskFromObject(instance: AnimatableObject) {
  // Remove mask wiring and restore source visibility if fabric detached it.
  const sourceObject = readMaskSourceObject(instance);
  clearMaskSync(instance);
  clearMaskProxy(instance);
  restoreMaskSourceObject(sourceObject);
  instance.fabricObject.set("clipPath", null);
  instance.fabricObject.set("dirty", true);
  instance.fabricObject.canvas?.requestRenderAll();
}

async function applyMaskFromCanvasObject(
  target: AnimatableObject,
  source: AnimatableObject,
) {
  // Create a dedicated clipPath proxy and sync it with source transform updates.
  clearMaskSync(target);
  clearMaskProxy(target);

  const maskProxy = await source.fabricObject.clone();
  const sourceCustomId = source.fabricObject.customId;
  if (typeof sourceCustomId === "string") {
    maskProxy.customId = sourceCustomId;
    maskProxy.set("customId", sourceCustomId);
  }

  syncMaskProxyFromSource(maskProxy, source.fabricObject);
  maskProxy.set("absolutePositioned", true);
  maskProxy.set("visible", false);
  maskProxy.set("evented", false);
  setMaskProxy(target, maskProxy, source.fabricObject);

  target.fabricObject.set("clipPath", maskProxy);
  target.fabricObject.set("dirty", true);
  target.fabricObject.canvas?.requestRenderAll();

  const syncMask = () => {
    syncMaskProxyFromSource(maskProxy, source.fabricObject);
    target.fabricObject.set("dirty", true);
    target.fabricObject.canvas?.requestRenderAll();
  };

  MASK_SYNC_EVENTS.forEach((eventName) => {
    source.fabricObject.on(eventName, syncMask);
  });

  setMaskSyncCleanup(target, () => {
    MASK_SYNC_EVENTS.forEach((eventName) => {
      source.fabricObject.off(eventName, syncMask);
    });
  });
}

function setMaskSyncCleanup(instance: AnimatableObject, cleanup: () => void) {
  // Store listener cleanup for later remask/unmask operations.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  objectWithCleanup.__maskSyncCleanup = cleanup;
}

function setMaskProxy(
  instance: AnimatableObject,
  proxyObject: AnimatableObject["fabricObject"],
  sourceObject: AnimatableObject["fabricObject"],
) {
  // Persist proxy+source refs so animation playback can sync mask transforms.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  objectWithCleanup.__maskProxyObject = proxyObject;
  objectWithCleanup.__maskSourceObject = sourceObject;
}

function clearMaskSync(instance: AnimatableObject) {
  // Execute and clear previously registered mask sync listeners.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  objectWithCleanup.__maskSyncCleanup?.();
  delete objectWithCleanup.__maskSyncCleanup;
}

function clearMaskProxy(instance: AnimatableObject) {
  // Dispose previous mask proxy to avoid stale references and memory leaks.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  const proxyObject = objectWithCleanup.__maskProxyObject;
  if (!proxyObject) return;
  if (instance.fabricObject.clipPath === proxyObject) {
    instance.fabricObject.set("clipPath", null);
  }
  if (typeof proxyObject.dispose === "function") {
    proxyObject.dispose();
  }
  delete objectWithCleanup.__maskProxyObject;
  delete objectWithCleanup.__maskSourceObject;
}

function readMaskSourceObject(instance: AnimatableObject) {
  // Read the true mask source object reference stored when mask was applied.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  return objectWithCleanup.__maskSourceObject;
}

function restoreMaskSourceObject(
  sourceObject?: AnimatableObject["fabricObject"],
) {
  // Only restore source visibility flags; never re-add clip proxies to canvas.
  if (!sourceObject) return;
  sourceObject.set("visible", true);
  sourceObject.set("evented", true);
  sourceObject.setCoords();
}

function syncMaskProxyFromSource(
  proxyObject: AnimatableObject["fabricObject"],
  sourceObject: AnimatableObject["fabricObject"],
) {
  // Keep mask proxy geometry aligned to the source object transform.
  proxyObject.set({
    left: sourceObject.left,
    top: sourceObject.top,
    scaleX: sourceObject.scaleX,
    scaleY: sourceObject.scaleY,
    angle: sourceObject.angle,
    skewX: sourceObject.skewX,
    skewY: sourceObject.skewY,
    flipX: sourceObject.flipX,
    flipY: sourceObject.flipY,
    originX: sourceObject.originX,
    originY: sourceObject.originY,
  });
  proxyObject.setCoords();
}
