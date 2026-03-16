/** Canvas Items List Item.Tsx module implementation. */
import {
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { setSelectedId, toggleItemLocked, updateItemName } from "../../../store/editor-slice";
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
  const childIds = useAppSelector((state) => state.editor.itemsRecord?.[id]?.childIds ?? []);
  const isLocked = useAppSelector((state) => state.editor.itemsRecord?.[id]?.isLocked ?? false);
  const selectedIds = useAppSelector((state) => state.editor.selectedId);
  const fabricCanvas = useCanvasAppContext();
  const dragControls = useDragControls();
  const { removeItemById } = useCanvasItems({
    fabricCanvas: fabricCanvas.fabricCanvasRef,
  });
  const instance = fabricCanvas.getObjectById(id);
  const fabricObject = instance?.fabricObject;
  const displayName = name ?? id;
  const isSelected = selectedIds.includes(id);
  const [isVisible, setIsVisible] = useState(true);
  const [draftName, setDraftName] = useState(displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isGroup = childIds.length > 0;

  useEffect(() => {
    if (!isEditingName) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditingName]);

  /** Selects the clicked canvas item in the editor store. */
  const handleClick = () => {
    if (isLocked) return;
    dispatch(setSelectedId([id]));
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
    if (!fabricObject) return;

    setIsVisible((isVisible) => {
      const nextVisible = !isVisible;
      if (!nextVisible && fabricObject.canvas?.getActiveObject() === fabricObject) {
        fabricObject.canvas.discardActiveObject();
        dispatch(setSelectedId([]));
      }
      fabricObject.set("visible", nextVisible);
      fabricObject.canvas?.requestRenderAll();
      return nextVisible;
    });
  };

  /** Removes this layer from both Fabric canvas state and editor state. */
  const deleteItem = () => {
    removeItemById(id);
  };

  /** Toggles whether this layer can participate in Fabric selection. */
  const toggleLocked = () => {
    if (!fabricObject) return;

    const nextLocked = !isLocked;
    fabricObject.set({
      evented: !nextLocked,
      hasControls: !nextLocked,
      selectable: !nextLocked,
    });

    if (nextLocked && fabricObject.canvas?.getActiveObject() === fabricObject) {
      fabricObject.canvas.discardActiveObject();
      dispatch(setSelectedId([]));
    }

    fabricObject.canvas?.requestRenderAll();
    dispatch(toggleItemLocked({ id, isLocked: nextLocked }));
  };

  /** Persists an inline layer-name edit back into the editor store. */
  const commitName = () => {
    if (!name) return;
    const nextName = draftName.trim() || id;
    dispatch(updateItemName({ id, name: nextName }));
    fabricObject?.set("layerName", nextName);

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
      className={`group relative`}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 1.01 }}
      style={{ zIndex: index }}
      layout="position"
    >
      <div
        className={`flex items-center gap-1.5 rounded-md border pl-1 pr-2 py-1.5text-left text-sm transition ${
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
          <GripVertical className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </button>
        {isGroup && (
          <button
            type="button"
            onClick={() => {
              setIsExpanded((isExpanded) => !isExpanded);
            }}
            className="grid h-6 w-4 shrink-0 place-items-center text-[#8f9aac] transition hover:text-[#d7dfeb]"
            aria-label={isExpanded ? `Collapse ${displayName}` : `Expand ${displayName}`}
            title={isExpanded ? "Collapse group" : "Expand group"}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              strokeWidth={1.8}
              aria-hidden
            />
          </button>
        )}

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

        <div
          className={`flex items-center bg-inherit absolute right-0 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100`}
          key={id}
        >
          <button
            type="button"
            onClick={toggleLocked}
            className={`grid size-5 shrink-0 place-items-center text-[#8f9aac] transition hover:text-[#d7dfeb] ${
              isLocked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={isLocked ? `Unlock ${displayName}` : `Lock ${displayName}`}
            title={isLocked ? "Unlock layer" : "Lock layer"}
          >
            {isLocked ? (
              <Lock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            ) : (
              <LockOpen className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={toggleVisibility}
            className={`grid size-5 shrink-0 place-items-center text-[#8f9aac]  ${isVisible ? "opacity-0" : ""} transition hover:text-[#d7dfeb] group-hover:opacity-100`}
            aria-label={isVisible ? `Hide ${name}` : `Show ${name}`}
            title={isVisible ? "Hide layer" : "Show layer"}
          >
            {isVisible ? (
              <Eye className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            ) : (
              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={deleteItem}
            className="grid size-5 shrink-0 place-items-center text-[#8f9aac] opacity-0 transition hover:text-[#ffb4bf] group-hover:opacity-100"
            aria-label={`Delete ${displayName}`}
            title="Delete layer"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </div>
      {isGroup && isExpanded ? (
        <div className="ml-3 mt-1 space-y-1 border-l border-white/8 pl-2 ">
          {childIds.map((childId, childIndex) => (
            <CanvasItemsListItem key={childId} id={childId} index={childIndex + 10} />
          ))}
        </div>
      ) : null}
    </Reorder.Item>
  );
}
