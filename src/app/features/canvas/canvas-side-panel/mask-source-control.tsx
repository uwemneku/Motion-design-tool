import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import type { AnimatableObject } from '../../shapes/animatable-object/object';
import { useCanvasAppContext } from '../hooks/use-canvas-app-context';
import {
  fieldClass,
  labelClass,
  MASK_SYNC_EVENTS,
  NONE_MASK_SOURCE_ID,
} from './const';

type MaskSourceControlProps = {
  selectedId: string | null;
  selectedInstance?: AnimatableObject;
};

type MaskSyncContainer = {
  __maskSyncCleanup?: () => void;
  __maskProxyObject?: AnimatableObject['fabricObject'];
  __maskSourceObject?: AnimatableObject['fabricObject'];
};

export function MaskSourceControl({
  selectedId,
  selectedInstance,
}: MaskSourceControlProps) {
  const { getInstanceById } = useCanvasAppContext();
  const [sourceId, setSourceId] = useState<string>(NONE_MASK_SOURCE_ID);
  const maskRequestVersionRef = useRef(0);

  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const itemsRecord = useSelector((state: RootState) => state.editor.itemsRecord);

  const maskCandidates = useMemo(() => {
    return canvasItemIds
      .filter((id) => id !== selectedId)
      .map((id) => ({
        id,
        name: itemsRecord[id]?.name ?? id,
      }));
  }, [canvasItemIds, itemsRecord, selectedId]);

  useEffect(() => {
    setSourceId(readMaskSourceId(selectedInstance));
  }, [selectedInstance]);

  if (!selectedInstance) return null;

  const onSourceChange = async (nextSourceId: string) => {
    // Handle mask selection changes and keep source objects visible on canvas.
    maskRequestVersionRef.current += 1;
    const requestVersion = maskRequestVersionRef.current;
    setSourceId(nextSourceId);
    if (nextSourceId === NONE_MASK_SOURCE_ID) {
      clearMaskFromObject(selectedInstance);
      return;
    }

    const sourceInstance = getInstanceById(nextSourceId);
    if (!sourceInstance || sourceInstance === selectedInstance) return;
    await applyMaskFromCanvasObject(selectedInstance, sourceInstance, () => {
      return requestVersion !== maskRequestVersionRef.current;
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface-muted)] p-2">
      <label className={labelClass}>
        <span>Mask Source</span>
        <select
          value={sourceId}
          onChange={(event) => {
            void onSourceChange(event.target.value);
          }}
          className={fieldClass}
        >
          <option value={NONE_MASK_SOURCE_ID}>None</option>
          {maskCandidates.map((maskItem) => (
            <option key={maskItem.id} value={maskItem.id}>
              {maskItem.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] text-[#8f8f8f]">
        Uses another canvas item as this object&apos;s mask.
      </p>
    </div>
  );
}

function readMaskSourceId(instance?: AnimatableObject): string {
  // Resolve the currently applied mask id from the target clipPath metadata.
  if (!instance) return NONE_MASK_SOURCE_ID;

  const clipPath = instance.fabricObject.clipPath;
  if (!clipPath) return NONE_MASK_SOURCE_ID;

  const sourceId =
    typeof clipPath.customId === 'string' ? clipPath.customId : undefined;
  if (sourceId && sourceId.length > 0) return sourceId;

  return NONE_MASK_SOURCE_ID;
}

function clearMaskFromObject(instance: AnimatableObject) {
  // Unbind sync listeners first, then restore the mask source object visibility.
  const clipPathObject = instance.fabricObject.clipPath;
  clearMaskSync(instance);
  clearMaskProxy(instance);
  restoreMaskSourceObject(instance, clipPathObject);
  instance.fabricObject.set('clipPath', null);
  instance.fabricObject.set('dirty', true);
  instance.fabricObject.canvas?.requestRenderAll();
}

async function applyMaskFromCanvasObject(
  target: AnimatableObject,
  source: AnimatableObject,
  isStaleRequest: () => boolean,
) {
  // Use a cloned proxy as clipPath so the source object remains visible on canvas.
  clearMaskSync(target);
  clearMaskProxy(target);

  const maskProxy = await source.fabricObject.clone();
  if (isStaleRequest()) {
    maskProxy.dispose();
    return;
  }
  const sourceCustomId = source.fabricObject.customId;
  if (typeof sourceCustomId === 'string') {
    maskProxy.customId = sourceCustomId;
    maskProxy.set('customId', sourceCustomId);
  }
  syncMaskProxyFromSource(maskProxy, source.fabricObject);
  maskProxy.set('absolutePositioned', true);
  maskProxy.set('visible', false);
  maskProxy.set('evented', false);
  setMaskProxy(target, maskProxy, source.fabricObject);

  target.fabricObject.set('clipPath', maskProxy);
  target.fabricObject.set('dirty', true);
  target.fabricObject.canvas?.requestRenderAll();

  const syncMask = () => {
    syncMaskProxyFromSource(maskProxy, source.fabricObject);
    target.fabricObject.set('dirty', true);
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
  // Store dynamic cleanup on the fabric object to detach listeners on remask/unmask.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  objectWithCleanup.__maskSyncCleanup = cleanup;
}

function setMaskProxy(
  instance: AnimatableObject,
  proxyObject: AnimatableObject['fabricObject'],
  sourceObject: AnimatableObject['fabricObject'],
) {
  // Store proxy+source references so playback can sync animated masks each frame.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  objectWithCleanup.__maskProxyObject = proxyObject;
  objectWithCleanup.__maskSourceObject = sourceObject;
}

function clearMaskSync(instance: AnimatableObject) {
  // Execute and clear previously registered mask sync cleanup handler.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  objectWithCleanup.__maskSyncCleanup?.();
  delete objectWithCleanup.__maskSyncCleanup;
}

function clearMaskProxy(instance: AnimatableObject) {
  // Remove and dispose a previous proxy clipPath object to avoid stale references.
  const objectWithCleanup = instance.fabricObject as MaskSyncContainer;
  const proxyObject = objectWithCleanup.__maskProxyObject;
  if (!proxyObject) return;
  if (instance.fabricObject.clipPath === proxyObject) {
    instance.fabricObject.set('clipPath', null);
  }
  if (typeof proxyObject.dispose === 'function') {
    proxyObject.dispose();
  }
  delete objectWithCleanup.__maskProxyObject;
  delete objectWithCleanup.__maskSourceObject;
}

function restoreMaskSourceObject(
  instance: AnimatableObject,
  clipPathObject: unknown,
) {
  // Fabric may stop rendering an object while used as clipPath; restore it on unmask.
  if (!clipPathObject || typeof clipPathObject !== 'object') return;
  if (!('set' in clipPathObject) || typeof clipPathObject.set !== 'function') {
    return;
  }

  clipPathObject.set('visible', true);
  clipPathObject.set('evented', true);

  const canvas = instance.fabricObject.canvas;
  if (!canvas) return;

  const typedClipPath = clipPathObject as AnimatableObject['fabricObject'];
  const existsOnCanvas = canvas.getObjects().includes(typedClipPath);
  if (!existsOnCanvas) {
    canvas.add(typedClipPath);
  }
  typedClipPath.setCoords();
}

function syncMaskProxyFromSource(
  proxyObject: AnimatableObject['fabricObject'],
  sourceObject: AnimatableObject['fabricObject'],
) {
  // Keep proxy geometry aligned with the source object transform.
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
