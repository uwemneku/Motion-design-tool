/** Canvas Items List Item.Tsx module implementation. */
import { Reorder } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store";
import { setSelectedId } from "../../../store/editor-slice";

type CanvasItemsListItemProps = {
  id: string;
};

/**
 * Single draggable canvas-item row with local selectors for item metadata.
 */
export function CanvasItemsListItem({ id }: CanvasItemsListItemProps) {
  const dispatch = useDispatch<AppDispatch>();
  const item = useSelector(
    (state: RootState) => state.editor.itemsRecord?.[id],
  );
  const selectedId = useSelector((state: RootState) => state.editor.selectedId);
  const name = item?.name ?? id;
  const isSelected = selectedId === id;

  const handleClick = () => {
    dispatch(setSelectedId(id));
  };

  return (
    <Reorder.Item
      value={id}
      className="cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.01 }}
    >
      <button
        type="button"
        className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
          isSelected
            ? "bg-[#38bdf8]/18 font-semibold text-[#dcefff]"
            : "text-[#e2e2e2] hover:bg-[var(--wise-surface-muted)]"
        }`}
        onClick={handleClick}
      >
        {name}
      </button>
    </Reorder.Item>
  );
}
