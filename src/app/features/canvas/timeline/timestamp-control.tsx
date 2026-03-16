import { Pause, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { TIMELINE_DURATION } from "../../../../const";
import { dispatchableSelector, useAppDispatch, useAppSelector } from "../../../store";
import { setIsPaused, setPlayheadTime as setPlayHeadTime } from "../../../store/editor-slice";

/** Playback transport with play state and precise current/duration readouts. */
function TimeStampControl() {
  const playheadTime = useAppSelector((state) => state.editor.playHeadTime);
  const isPaused = useAppSelector((state) => state.editor.isPaused);
  const dispatch = useAppDispatch();

  const frameRef = useRef<number | null>(null);

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
      return;
    }

    let startTimestamp: number | null = null;
    let startPlayheadTime: number | null = null;

    /** Advances playback from the playhead position captured on the first active frame. */
    const tick = (now: number) => {
      startTimestamp ??= now;
      startPlayheadTime ??= dispatch(dispatchableSelector((state) => state.editor.playHeadTime));
      const elapsedSeconds = (now - startTimestamp) / 1000;
      const rawNextTime = startPlayheadTime + elapsedSeconds;
      const nextTime =
        rawNextTime >= TIMELINE_DURATION ? rawNextTime % TIMELINE_DURATION : rawNextTime;

      dispatch(setPlayHeadTime(Number(nextTime.toFixed(3))));
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
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
          <Play className="h-4 w-4 fill-current" strokeWidth={2} aria-hidden />
        ) : (
          <Pause className="h-4 w-4" strokeWidth={2} aria-hidden />
        )}
      </button>

      <div className="flex items-center gap-1.5 text-sm text-slate-100">
        <span className="px-1 font-mono text-[12px] tabular-nums">
          {formatPreciseTimelineTime(playheadTime)}
        </span>
        <span className="text-slate-400">/</span>
        <span className="px-1 font-mono text-[12px] tabular-nums">
          {formatPreciseTimelineTime(TIMELINE_DURATION, true)}
        </span>
      </div>
    </div>
  );
}

export default TimeStampControl;

/** Formats a seconds value for the transport readout. */
function formatPreciseTimelineTime(seconds: number, includeUnit = false) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const formatted = safeSeconds.toFixed(2);
  return includeUnit ? `${formatted} s` : formatted;
}
