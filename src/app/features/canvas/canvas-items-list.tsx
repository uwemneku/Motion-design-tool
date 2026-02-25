import { Reorder } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { setCanvasItemIds } from "../../store/editor-slice";
import { CanvasItemsListItem } from "./items-list/canvas-items-list-item";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";

export default function CanvasItemsList() {
  const dispatch = useDispatch<AppDispatch>();
  const { getObjectById: getInstanceById } = useCanvasAppContext();
  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const displayItemIds = canvasItemIds;

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

  const onReorder = (nextDisplayIds: string[]) => {
    // Reorder payload from UI remains top-to-bottom in state.
    dispatch(setCanvasItemIds(nextDisplayIds));
    syncCanvasStackOrder(nextDisplayIds);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#d0d0d0]">
        Canvas Items
      </h2>

      {canvasItemIds.length === 0 ? (
        <p className="text-sm text-[#8f8f8f]">No items on canvas</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={displayItemIds}
          onReorder={onReorder}
          className="space-y-1 rounded-lg border border-[var(--wise-border)] bg-[var(--wise-surface)] p-1"
        >
          {displayItemIds.map((id) => (
            <CanvasItemsListItem key={id} id={id} />
          ))}
        </Reorder.Group>
      )}
    </section>
  );
}
