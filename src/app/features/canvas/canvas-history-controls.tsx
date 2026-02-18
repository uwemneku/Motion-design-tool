import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { requestRedo, requestUndo } from '../../store/history-slice';

type CanvasHistoryControlsProps = {
  disabled?: boolean;
};

export default function CanvasHistoryControls({
  disabled = false,
}: CanvasHistoryControlsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const canRedo = useSelector((state: RootState) => state.history.canRedo);
  const canUndo = useSelector((state: RootState) => state.history.canUndo);

  return (
    <>
      <button
        type='button'
        onClick={() => {
          dispatch(requestUndo());
        }}
        disabled={!canUndo || disabled}
        className='rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--wise-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50'
      >
        Undo
      </button>
      <button
        type='button'
        onClick={() => {
          dispatch(requestRedo());
        }}
        disabled={!canRedo || disabled}
        className='rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[var(--wise-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50'
      >
        Redo
      </button>
    </>
  );
}
