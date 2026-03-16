/** Canvas History Controls.Tsx module implementation. */
import { Redo2, Undo2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { requestRedo, requestUndo } from "../../../store/history-slice";

type CanvasHistoryControlsProps = {
  disabled?: boolean;
};

/** Toolbar controls for undo and redo actions. */
export default function CanvasHistoryControls({
  disabled = false,
}: CanvasHistoryControlsProps) {
  const dispatch = useAppDispatch();
  const canRedo = useAppSelector((state) => state.history.canRedo);
  const canUndo = useAppSelector((state) => state.history.canUndo);

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          dispatch(requestUndo());
        }}
        disabled={!canUndo || disabled}
        className="inline-flex size-8 items-center justify-center rounded-[5px] border border-[var(--wise-border)] bg-[var(--wise-surface)] text-slate-200 hover:bg-[var(--wise-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Undo"
        title="Undo"
      >
        <Undo2 className="size-4" strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => {
          dispatch(requestRedo());
        }}
        disabled={!canRedo || disabled}
        className="inline-flex size-8 items-center justify-center rounded-[5px] border border-[var(--wise-border)] bg-[var(--wise-surface)] text-slate-200 hover:bg-[var(--wise-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Redo"
        title="Redo"
      >
        <Redo2 className="size-4" strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}
