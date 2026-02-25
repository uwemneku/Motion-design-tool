/** Mask Source Control.Tsx canvas side panel UI logic. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { emitMaskHistoryEvent } from "../util/mask-history-events";
import {
  readMaskSourceId,
  setMaskSourceForInstance,
} from "../util/masking-util";
import type { AnimatableObject } from "../../shapes/animatable-object/object";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import { NONE_MASK_SOURCE_ID } from "../../../../const";
import { fieldClass, labelClass } from "./util";

type MaskSourceControlProps = {
  selectedId: string | null;
  selectedInstance?: AnimatableObject;
};

/** Select control for assigning another canvas item as a mask source. */
export function MaskSourceControl({
  selectedId,
  selectedInstance,
}: MaskSourceControlProps) {
  const { getObjectById: getInstanceById } = useCanvasAppContext();
  const [sourceId, setSourceId] = useState<string>(NONE_MASK_SOURCE_ID);
  const maskRequestVersionRef = useRef(0);

  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const itemsRecord = useSelector(
    (state: RootState) => state.editor.itemsRecord,
  );

  const maskCandidates = useMemo(() => {
    // Keep dropdown options in sync with all other canvas items.
    return canvasItemIds
      .filter((id) => id !== selectedId)
      .map((id) => ({
        id,
        name: itemsRecord[id]?.name ?? id,
      }));
  }, [canvasItemIds, itemsRecord, selectedId]);

  useEffect(() => {
    // Reflect current mask source when selected item changes.
    setSourceId(readMaskSourceId(selectedInstance));
  }, [selectedInstance]);

  if (!selectedInstance) return null;

  const onSourceChange = async (nextSourceId: string) => {
    // Apply mask change and emit history event for undo/redo support.
    if (!selectedId) return;
    maskRequestVersionRef.current += 1;
    const requestVersion = maskRequestVersionRef.current;

    const previousSourceId = readMaskSourceId(selectedInstance);
    setSourceId(nextSourceId);

    if (nextSourceId === NONE_MASK_SOURCE_ID) {
      await setMaskSourceForInstance(selectedInstance);
      if (requestVersion !== maskRequestVersionRef.current) return;
      if (previousSourceId !== NONE_MASK_SOURCE_ID) {
        emitMaskHistoryEvent({
          targetId: selectedId,
          previousSourceId,
          nextSourceId: NONE_MASK_SOURCE_ID,
        });
      }
      return;
    }

    const sourceInstance = getInstanceById(nextSourceId);
    if (!sourceInstance || sourceInstance === selectedInstance) return;

    await setMaskSourceForInstance(selectedInstance, sourceInstance);
    if (requestVersion !== maskRequestVersionRef.current) return;
    if (previousSourceId !== nextSourceId) {
      emitMaskHistoryEvent({
        targetId: selectedId,
        previousSourceId,
        nextSourceId,
      });
    }
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
