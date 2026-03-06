/** Canvas Items List.Tsx module implementation. */
import { Reorder } from "framer-motion";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setCanvasItemIds } from "../../../store/editor-slice";
import { CanvasItemsListItem } from "./canvas-items-list-item";

/** Reorderable list of canvas items shown from top-most to bottom-most. */
export default function CanvasItemsList() {
  const dispatch = useAppDispatch();
  const { getObjectById: getInstanceById } = useCanvasAppContext();
  const canvasItemIds = useAppSelector((state) => state.editor.canvasItemIds);
  const displayItemIds = canvasItemIds;

  /** Syncs the visual list order back into the Fabric canvas stacking order. */
  const syncCanvasStackOrder = (idsInOrder: string[]) => {
    // Apply top-to-bottom UI order to Fabric z-index (bottom is index 0).
    const itemCount = idsInOrder.length;
    for (let index = 0; index < itemCount; index += 1) {
      const id = idsInOrder[index];
      const instance = getInstanceById(id);
      const object = instance?.fabricObject;
      const canvas = object?.canvas;
      if (!object || !canvas) continue;
      const stackIndex = itemCount - 1 - index;

      if (typeof canvas.moveObjectTo === "function") {
        canvas.moveObjectTo(object, stackIndex);
      } else if ("moveTo" in object && typeof object.moveTo === "function") {
        object.moveTo(stackIndex);
      }
      canvas.requestRenderAll();
    }
  };

  /** Persists the reordered list and applies the equivalent canvas z-order. */
  const onReorder = (nextDisplayIds: string[]) => {
    // Reorder payload from UI remains top-to-bottom in state.
    dispatch(setCanvasItemIds(nextDisplayIds));
    syncCanvasStackOrder(nextDisplayIds);
  };

  return (
    <section className="space-y-3">
      {canvasItemIds.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">No items on canvas</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={displayItemIds}
          onReorder={onReorder}
          className="space-y-1 rounded-lg border border-[var(--wise-border)] bg-[var(--wise-surface)] p-1"
        >
          {displayItemIds.map((id, index) => (
            <CanvasItemsListItem key={id} id={id} index={index} />
          ))}
        </Reorder.Group>
      )}
    </section>
  );
}
