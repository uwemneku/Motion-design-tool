/** Canvas History Controls.Tsx module implementation. */
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
        className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] text-slate-200 hover:bg-[var(--wise-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Undo"
        title="Undo"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={() => {
          dispatch(requestRedo());
        }}
        disabled={!canRedo || disabled}
        className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] text-slate-200 hover:bg-[var(--wise-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Redo"
        title="Redo"
      >
        <RedoIcon />
      </button>
    </div>
  );
}

/** Renders the undo toolbar icon. */
function UndoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
    >
      <path
        d="M9 7H5v4"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 11a8 8 0 111.9 5.2"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Renders the redo toolbar icon. */
function RedoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
    >
      <path
        d="M15 7h4v4"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 11a8 8 0 10-1.9 5.2"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
