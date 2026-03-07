/** Canvas Items List.Tsx module implementation. */
import { Reorder } from "framer-motion";
import { useEffect } from "react";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setCanvasItemIds } from "../../../store/editor-slice";
import { useCanvasItems } from "../hooks/use-canvas-items";
import { CanvasItemsListItem } from "./canvas-items-list-item";

/** Reorderable list of canvas items shown from top-most to bottom-most. */
export default function CanvasItemsList() {
  const dispatch = useAppDispatch();
  const { fabricCanvasRef, getObjectById: getInstanceById } =
    useCanvasAppContext();
  const canvasItemIds = useAppSelector((state) => state.editor.canvasItemIds);
  const selectedId = useAppSelector((state) => state.editor.selectedId);
  const displayItemIds = canvasItemIds;
  const { removeItemById } = useCanvasItems({ fabricCanvas: fabricCanvasRef });

  useEffect(() => {
    /** Deletes the selected item unless focus is inside an editable field. */
    const onWindowKeyDown = (event: KeyboardEvent) => {
      const isDeleteKey =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        event.code === "Delete" ||
        event.code === "Backspace";
      if (!isDeleteKey) return;
      if (!selectedId) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      removeItemById(selectedId);
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [removeItemById, selectedId]);

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

  if (canvasItemIds.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute left-4 top-4 z-20 flex max-h-[min(440px,calc(100vh-184px))] w-50.5 flex-col overflow-hidden rounded-xl border border-white/10 bg-[rgba(18,22,30,0.72)] p-1 shadow-[0_16px_34px_rgba(0,0,0,0.26)] backdrop-blur-2xl"
      data-testid="floating-layers-panel"
    >
      <section className="min-h-0 flex-1 overflow-y-auto overflow-x-visible">
        <Reorder.Group
          axis="y"
          values={displayItemIds}
          onReorder={onReorder}
          className="space-y-1 px-px"
        >
          {displayItemIds.map((id, index) => (
            <CanvasItemsListItem key={id} id={id} index={index} />
          ))}
        </Reorder.Group>
      </section>
    </div>
  );
}
