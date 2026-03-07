/** Canvas Items List Item.Tsx module implementation. */
import { Reorder } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setSelectedId } from "../../../store/editor-slice";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";

type CanvasItemsListItemProps = {
  id: string;
  index: number;
};

/**
 * Single draggable canvas-item row with local selectors for item metadata.
 */
export function CanvasItemsListItem({ id, index }: CanvasItemsListItemProps) {
  const dispatch = useAppDispatch();
  const item = useAppSelector((state) => state.editor.itemsRecord?.[id]);
  const selectedId = useAppSelector((state) => state.editor.selectedId);
  const fabricCanvas = useCanvasAppContext();
  const name = item?.name ?? id;
  const isSelected = selectedId === id;

  /** Selects the clicked canvas item in the editor store. */
  const handleClick = () => {
    dispatch(setSelectedId(id));
    const instance = fabricCanvas.getObjectById(id);
    if (instance) {
      instance.fabricObject.canvas?.setActiveObject(instance.fabricObject);
    }
  };

  return (
    <Reorder.Item
      value={id}
      className="cursor-grab active:cursor-grabbing relative"
      whileDrag={{ scale: 1.01 }}
      style={{ zIndex: index }}
    >
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-[9px] border px-2.5 py-2 text-left text-sm transition ${
          isSelected
            ? "border-white/14 bg-[rgba(255,255,255,0.12)] font-semibold text-[#f5f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "border-transparent bg-[rgba(255,255,255,0.025)] text-[#dfe7f3] hover:border-white/10 hover:bg-[rgba(255,255,255,0.06)]"
        }`}
        onClick={handleClick}
      >
        <span className="size-4 shrink-0 rounded-[6px] border border-white/8 bg-white/10" />
        <span className="truncate text-[11px]">{name}</span>
      </button>
    </Reorder.Item>
  );
}
