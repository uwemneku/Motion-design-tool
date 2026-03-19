/** Mask Source Control.Tsx canvas side panel UI logic. */
import { useEffect, useMemo, useRef, useState } from "react";
import { RadixMenuSelect } from "../../../components/radix-menu-select";
import { useAppSelector } from "../../../store";
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
  const { getObjectById } = useCanvasAppContext();
  const [sourceId, setSourceId] = useState<string>(NONE_MASK_SOURCE_ID);
  const maskRequestVersionRef = useRef(0);

  const canvasItemIds = useAppSelector((state) => state.editor.canvasItemIds);
  const itemsRecord = useAppSelector((state) => state.editor.itemsRecord);

  const maskCandidates = useMemo(() => {
    // Keep dropdown options in sync with all other canvas items.
    return canvasItemIds
      .filter((id) => id !== selectedId)
      .map((id) => ({
        id,
        name: itemsRecord[id]?.name ?? id,
      }));
  }, [canvasItemIds, itemsRecord, selectedId]);
  const maskOptions = useMemo(
    () => [
      { label: "None", value: NONE_MASK_SOURCE_ID },
      ...maskCandidates.map((maskItem) => ({
        label: maskItem.name,
        value: maskItem.id,
      })),
    ],
    [maskCandidates],
  );

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

    const sourceInstance = getObjectById(nextSourceId);
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
        <RadixMenuSelect
          ariaLabel="Select mask source"
          contentClassName="z-50 min-w-[180px] rounded-[6px] border border-[rgba(141,171,255,0.14)] bg-[rgba(25,25,28,0.98)] p-1 shadow-[0_28px_44px_rgba(141,171,255,0.06)] backdrop-blur-xl"
          options={maskOptions}
          triggerClassName={`${fieldClass} inline-flex items-center justify-between gap-2`}
          value={sourceId}
          onValueChange={(value) => {
            void onSourceChange(value);
          }}
        />
      </label>
      <p className="text-[11px] text-[#8f8f8f]">
        Uses another canvas item as this object&apos;s mask.
      </p>
    </div>
  );
}
