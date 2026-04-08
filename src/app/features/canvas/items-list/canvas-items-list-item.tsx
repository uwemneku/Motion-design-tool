/** Canvas Items List Item.Tsx module implementation. */
import { ActiveSelection } from "fabric";
import {
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditingName) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditingName]);

  /** Selects one layer or extends the current Fabric selection with Shift-click. */
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isLocked) return;

    if (!instance) {
      dispatch(setSelectedId([id]));
      return;
    }

    const canvas = instance.fabricObject.canvas;
    if (!canvas) {
      dispatch(setSelectedId([id]));
      return;
    }

    if (event.shiftKey) {
      const activeObject = canvas.getActiveObject();
      const existingObjects =
        activeObject instanceof ActiveSelection
          ? activeObject.getObjects()
          : activeObject
            ? [activeObject]
            : [];
      const nextObjects = existingObjects.includes(instance.fabricObject)
        ? existingObjects
        : [...existingObjects, instance.fabricObject];

      if (nextObjects.length > 1) {
        canvas.setActiveObject(new ActiveSelection(nextObjects, { canvas }));
        canvas.requestRenderAll();
        return;
      }
    }

    dispatch(setSelectedId([id]));
    canvas.setActiveObject(instance.fabricObject);
    canvas.requestRenderAll();
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
        className={`flex items-center gap-1.5 rounded-md border px-1 py-1.5 text-left text-sm transition ${
          isSelected
            ? "border-[rgba(255,255,255,0.18)] bg-transparent font-semibold text-[#f5f7fb] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
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

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left"
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
          className={`ml-auto flex w-[3.75rem] shrink-0 items-center justify-end gap-px bg-inherit transition ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
          key={id}
        >
          <button
            type="button"
            onClick={toggleLocked}
            className={`grid size-5 shrink-0 place-items-center rounded-[4px] text-[#8f9aac] transition hover:bg-white/6 hover:text-[#d7dfeb] ${
              isLocked
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
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
            className={`grid size-5 shrink-0 place-items-center rounded-[4px] text-[#8f9aac] transition hover:bg-white/6 hover:text-[#d7dfeb] ${
              isVisible ? "opacity-0" : ""
            } group-hover:opacity-100 group-focus-within:opacity-100`}
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
            className="grid size-5 shrink-0 place-items-center rounded-[4px] text-[#8f9aac] opacity-0 transition hover:bg-white/6 hover:text-[#ffb4bf] group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={`Delete ${displayName}`}
            title="Delete layer"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}
