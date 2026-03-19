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
  const { fabricCanvasRef, getObjectById } = useCanvasAppContext();
  const canvasItemIds = useAppSelector((state) => state.editor.canvasItemIds);
  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const { copySelectedItems, groupSelectedItems, pasteCopiedItems, removeItemById } = useCanvasItems({
    fabricCanvas: fabricCanvasRef,
  });

  useEffect(() => {
    /** Handles global canvas shortcuts unless focus is inside an editable field. */
    const onWindowKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      const isCopyShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        (event.key.toLowerCase() === "c" || event.code === "KeyC");
      if (isCopyShortcut) {
        if (isEditingText || selectedIds.length === 0) return;
        event.preventDefault();
        await copySelectedItems();
        return;
      }

      const isPasteShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        (event.key.toLowerCase() === "v" || event.code === "KeyV");
      if (isPasteShortcut) {
        if (isEditingText) return;
        event.preventDefault();
        await pasteCopiedItems();
        return;
      }

      /** Deletes the selected item unless focus is inside an editable field. */
      const isDeleteKey =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        event.code === "Delete" ||
        event.code === "Backspace";
      if (!isDeleteKey) return;
      if (selectedIds.length === 0) return;
      if (isEditingText) return;

      event.preventDefault();
      selectedIds.forEach((id) => {
        removeItemById(id);
      });
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [copySelectedItems, pasteCopiedItems, removeItemById, selectedIds]);

  /** Syncs the visual list order back into the Fabric canvas stacking order. */
  const syncCanvasStackOrder = (idsInOrder: string[]) => {
    // Apply top-to-bottom UI order to Fabric z-index (bottom is index 0).
    const itemCount = idsInOrder.length;
    for (let index = 0; index < itemCount; index += 1) {
      const id = idsInOrder[index];
      const instance = getObjectById(id);
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
      className="pointer-events-auto absolute left-4 top-4 z-20 flex max-h-[min(440px,calc(100vh-184px))] w-60 flex-col overflow-hidden rounded-xl border border-white/8 bg-[rgba(43,43,46,0.9)] p-1 shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
      data-testid="floating-layers-panel"
    >
      {selectedIds.length > 1 ? (
        <div className="border-b border-white/8 px-1 pb-1">
          <button
            type="button"
            onClick={() => {
              groupSelectedItems();
            }}
            className="flex h-7 w-full items-center justify-center rounded-md border border-white/8 bg-[rgba(255,255,255,0.045)] px-2 text-[11px] font-medium text-[#f3f4f6] transition hover:border-white/14 hover:bg-[rgba(255,255,255,0.08)]"
          >
            Group selected
          </button>
        </div>
      ) : null}
      <section className="min-h-0 flex-1 overflow-y-auto overflow-x-visible">
        <Reorder.Group
          axis="y"
          values={canvasItemIds}
          onReorder={onReorder}
          className="space-y-1 px-px"
        >
          {canvasItemIds.map((id, index) => (
            <CanvasItemsListItem key={id} id={id} index={index} />
          ))}
        </Reorder.Group>
      </section>
    </div>
  );
}
