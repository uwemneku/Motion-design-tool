import { Reorder } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { setCanvasItemIds, setSelectedId } from "../../store/editor-slice";
import { useCanvasAppContext } from "./hooks/use-canvas-app-context";

function toDisplayOrder(idsInStackOrder: string[]) {
  // Render top-most canvas objects first in the list.
  return [...idsInStackOrder].reverse();
}

function toStackOrder(idsInDisplayOrder: string[]) {
  // Convert list order back to bottom-to-top stacking order for canvas operations.
  return [...idsInDisplayOrder].reverse();
}

export default function CanvasItemsList() {
  const dispatch = useDispatch<AppDispatch>();
  const { getInstanceById } = useCanvasAppContext();
  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const itemsRecord = useSelector(
    (state: RootState) => state.editor.itemsRecord,
  );
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const displayItemIds = toDisplayOrder(canvasItemIds);

  const syncCanvasStackOrder = (idsInOrder: string[]) => {
    // Apply bottom-to-top order to Fabric stacking indices.
    for (const [index, id] of idsInOrder.entries()) {
      const instance = getInstanceById(id);
      const object = instance?.fabricObject;
      const canvas = object?.canvas;
      if (!object || !canvas) continue;

      if (typeof canvas.moveObjectTo === "function") {
        canvas.moveObjectTo(object, index);
      } else if ("moveTo" in object && typeof object.moveTo === "function") {
        object.moveTo(index);
      }
      canvas.requestRenderAll();
    }
  };

  const onReorder = (nextDisplayIds: string[]) => {
    // Reorder payload from UI (top-to-bottom) is converted back to stack order.
    const nextStackIds = toStackOrder(nextDisplayIds);
    dispatch(setCanvasItemIds(nextStackIds));
    syncCanvasStackOrder(nextStackIds);
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
          {displayItemIds.map((id) => {
            const item = itemsRecord[id];
            const name = item?.name ?? id;
            const isSelected = selectedId === id;

            return (
              <Reorder.Item
                key={id}
                value={id}
                className="cursor-grab active:cursor-grabbing"
                whileDrag={{ scale: 1.01 }}
              >
                <button
                  type="button"
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-[#0d99ff]/18 font-semibold text-[#dcefff]"
                      : "text-[#e2e2e2] hover:bg-[var(--wise-surface-muted)]"
                  }`}
                  onClick={() => {
                    dispatch(setSelectedId(id));
                  }}
                >
                  {name}
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}
    </section>
  );
}
