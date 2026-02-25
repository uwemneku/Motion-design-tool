import { useEffect, useRef } from "react";
import { TIMELINE_DURATION } from "../../../../const";
import { useAppDispatch, useAppSelector } from "../../../store";
import {
  setIsPaused,
  setPlayheadTime as setPlayHeadTime,
} from "../../../store/editor-slice";

function TimeStampControl() {
  const playheadTime = useAppSelector((state) => state.editor.playHeadTime);
  const playheadRef = useRef(playheadTime);
  const isPaused = useAppSelector((state) => state.editor.isPaused);
  const dispatch = useAppDispatch();

  const frameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

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
      dispatch(setIsPaused(!isPaused));
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [dispatch, isPaused]);

  useEffect(() => {
    if (isPaused) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTickRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const previous = lastTickRef.current ?? now;
      const deltaSeconds = (now - previous) / 1000;
      const rawNextTime = playheadRef.current + deltaSeconds;
      const nextTime =
        rawNextTime >= TIMELINE_DURATION
          ? rawNextTime % TIMELINE_DURATION
          : rawNextTime;

      lastTickRef.current = now;
      playheadRef.current = nextTime;
      dispatch(setPlayHeadTime(Number(nextTime.toFixed(3))));

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTickRef.current = null;
    };
  }, [dispatch, isPaused]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          dispatch(setIsPaused(!isPaused));
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] text-slate-200 hover:bg-[var(--wise-surface-muted)]"
        title={isPaused ? "Play timeline" : "Pause timeline"}
        aria-label={isPaused ? "Play timeline" : "Pause timeline"}
      >
        {isPaused ? (
          <svg viewBox="0 0 12 12" className="h-4 w-4 fill-current">
            <path d="M3 2.2l6 3.8-6 3.8z" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-4 w-4 fill-current">
            <path d="M2.5 2h2v8h-2zM7.5 2h2v8h-2z" />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-1.5 text-sm text-slate-100">
        <span className="rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-1 font-mono text-[12px] tabular-nums">
          {formatPreciseTimelineTime(playheadTime)}
        </span>
        <span className="text-slate-400">/</span>
        <span className="rounded-md border border-[var(--wise-border)] bg-[var(--wise-surface)] px-2 py-1 font-mono text-[12px] tabular-nums">
          {formatPreciseTimelineTime(TIMELINE_DURATION, true)}
        </span>
      </div>
    </div>
  );
}

export default TimeStampControl;

function formatPreciseTimelineTime(seconds: number, includeUnit = false) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const formatted = safeSeconds.toFixed(2);
  return includeUnit ? `${formatted} s` : formatted;
}
