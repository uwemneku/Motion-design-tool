/** Canvas Items List Item.Tsx module implementation. */
import { Reorder, useDragControls } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setSelectedId,
  toggleItemLocked,
  updateItemName,
} from "../../../store/editor-slice";
import { useCanvasAppContext } from "../hooks/use-canvas-app-context";
import { useCanvasItems } from "../hooks/use-canvas-items";

type CanvasItemsListItemProps = {
  id: string;
  index: number;
};

/**
 * Single draggable canvas-item row with local selectors for item metadata.
 */
export function CanvasItemsListItem({ id, index }: CanvasItemsListItemProps) {
  const dispatch = useAppDispatch();
  const name = useAppSelector((state) => state.editor.itemsRecord?.[id]?.name);
  const isLocked = useAppSelector(
    (state) => state.editor.itemsRecord?.[id]?.isLocked ?? false,
  );
  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const fabricCanvas = useCanvasAppContext();
  const dragControls = useDragControls();
  const { removeItemById } = useCanvasItems({
    fabricCanvas: fabricCanvas.fabricCanvasRef,
  });
  const displayName = name ?? id;
  const isSelected = selectedIds.includes(id);
  const [isVisible, setIsVisible] = useState(true);
  const [draftName, setDraftName] = useState(displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditingName) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditingName]);

  /** Selects the clicked canvas item in the editor store. */
  const handleClick = () => {
    if (isLocked) return;
    dispatch(setSelectedId([id]));
    const instance = fabricCanvas.getObjectById(id);
    if (instance) {
      instance.fabricObject.canvas?.setActiveObject(instance.fabricObject);
    }
  };

  /** Starts layer reordering from the dedicated row handle. */
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    dragControls.start(event);
  };

  /** Toggles whether the linked Fabric object is rendered on the canvas. */
  const toggleVisibility = () => {
    const instance = fabricCanvas.getObjectById(id);
    const object = instance?.fabricObject;
    if (!object) return;

    setIsVisible((isVisible) => {
      const nextVisible = !isVisible;
      if (!nextVisible && object.canvas?.getActiveObject() === object) {
        object.canvas.discardActiveObject();
        dispatch(setSelectedId([]));
      }
      object.set("visible", nextVisible);
      object.canvas?.requestRenderAll();
      return nextVisible;
    });
  };

  /** Removes this layer from both Fabric canvas state and editor state. */
  const deleteItem = () => {
    removeItemById(id);
  };

  /** Toggles whether this layer can participate in Fabric selection. */
  const toggleLocked = () => {
    const instance = fabricCanvas.getObjectById(id);
    const object = instance?.fabricObject;
    if (!object) return;

    const nextLocked = !isLocked;
    object.set({
      evented: !nextLocked,
      hasControls: !nextLocked,
      selectable: !nextLocked,
    });

    if (nextLocked && object.canvas?.getActiveObject() === object) {
      object.canvas.discardActiveObject();
      dispatch(setSelectedId([]));
    }

    object.canvas?.requestRenderAll();
    dispatch(toggleItemLocked({ id, isLocked: nextLocked }));
  };

  /** Persists an inline layer-name edit back into the editor store. */
  const commitName = () => {
    if (!name) return;
    const nextName = draftName.trim() || id;
    dispatch(updateItemName({ id, name: nextName }));

    setDraftName(nextName);
    setIsEditingName(false);
  };

  /** Cancels inline renaming and restores the current stored label. */
  const cancelNameEdit = () => {
    setDraftName(name);
    setIsEditingName(false);
  };

  /** Handles confirm/cancel shortcuts while editing a layer name. */
  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitName();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelNameEdit();
    }
  };

  return (
    <Reorder.Item
      value={id}
      className="group relative"
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 1.01 }}
      style={{ zIndex: index }}
    >
      <div
        className={`flex  items-center gap-2 rounded-md border pl-1 px-2 py-2 text-left text-sm transition ${
          isSelected
            ? "border-white/14 bg-[rgba(255,255,255,0.12)] font-semibold text-[#f5f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "border-transparent bg-[rgba(255,255,255,0.025)] text-[#dfe7f3] hover:border-white/10 hover:bg-[rgba(255,255,255,0.06)]"
        }`}
      >
        <button
          type="button"
          onPointerDown={startDrag}
          className="grid h-6 w-5 shrink-0 place-items-center text-[#8f9aac] transition-colors cursor-grab active:cursor-grabbing hover:text-[#d7dfeb]"
          aria-label={`Drag ${name}`}
          title="Drag to reorder"
        >
          <svg
            viewBox="0 0 8 16"
            className="h-4 w-2"
            fill="currentColor"
            aria-hidden
          >
            <circle cx="2" cy="3" r="1" />
            <circle cx="6" cy="3" r="1" />
            <circle cx="2" cy="8" r="1" />
            <circle cx="6" cy="8" r="1" />
            <circle cx="2" cy="13" r="1" />
            <circle cx="6" cy="13" r="1" />
          </svg>
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={handleClick}
          onDoubleClick={() => {
            setIsEditingName(true);
          }}
        >
          <span className="size-4 shrink-0 rounded-[6px] border border-white/8 bg-white/10" />
          {isEditingName ? (
            <input
              ref={inputRef}
              type="text"
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
              }}
              onBlur={commitName}
              onKeyDown={handleNameKeyDown}
              onClick={(event) => {
                event.stopPropagation();
              }}
              className="min-w-0 flex-1 rounded-sm border border-white/12 bg-white/8 px-1.5 py-0.5 text-[11px] text-[#f5f7fb] outline-none"
            />
          ) : (
            <span className="truncate text-[11px]" title={name}>
              {name}
            </span>
          )}
        </button>

        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleLocked}
            className={`grid size-5 shrink-0 place-items-center text-[#8f9aac] transition hover:text-[#d7dfeb] ${
              isLocked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={isLocked ? `Unlock ${displayName}` : `Lock ${displayName}`}
            title={isLocked ? "Unlock layer" : "Lock layer"}
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {isLocked ? (
                <>
                  <path d="M5.5 7V5.5a2.5 2.5 0 1 1 5 0V7" />
                  <rect x="3.5" y="7" width="9" height="6" rx="1.5" />
                </>
              ) : (
                <>
                  <path d="M10.5 7V5.5a2.5 2.5 0 0 0-4.8-1" />
                  <path d="M12.5 9.5V7A1.5 1.5 0 0 0 11 5.5H5A1.5 1.5 0 0 0 3.5 7v6A1.5 1.5 0 0 0 5 14.5h6" />
                </>
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleVisibility}
            className={`grid size-5 shrink-0 place-items-center text-[#8f9aac]  ${isVisible ? "opacity-0" : ""} transition hover:text-[#d7dfeb] group-hover:opacity-100`}
            aria-label={isVisible ? `Hide ${name}` : `Show ${name}`}
            title={isVisible ? "Hide layer" : "Show layer"}
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {isVisible ? (
                <>
                  <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z" />
                  <circle cx="8" cy="8" r="2.1" />
                </>
              ) : (
                <>
                  <path d="m2 2 12 12" />
                  <path d="M6.2 4.4A7.1 7.1 0 0 1 8 4c4.1 0 6.5 4 6.5 4a11.7 11.7 0 0 1-2.4 2.8" />
                  <path d="M9.7 9.9A2.5 2.5 0 0 1 6.1 6.3" />
                  <path d="M4.2 6A11 11 0 0 0 1.5 8s2.4 4 6.5 4c.7 0 1.4-.1 2-.3" />
                </>
              )}
            </svg>
          </button>

          <button
            type="button"
            onClick={deleteItem}
            className="grid size-5 shrink-0 place-items-center text-[#8f9aac] opacity-0 transition hover:text-[#ffb4bf] group-hover:opacity-100"
            aria-label={`Delete ${displayName}`}
            title="Delete layer"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3.5 4h9" />
              <path d="M6.2 4V3a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1" />
              <path d="M5.2 5.3v6a1 1 0 0 0 1 1H9.8a1 1 0 0 0 1-1v-6" />
              <path d="M6.9 6.6v3.4M9.1 6.6v3.4" />
            </svg>
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}
