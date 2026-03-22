import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TIMELINE_DURATION } from "../../../../const";
import { dispatchableSelector, useAppDispatch, useAppSelector } from "../../../store";
import {
  setIsPaused,
  setPlayheadTime as setPlayHeadTime,
  setProjectInfo,
} from "../../../store/editor-slice";

type EditableField = "duration" | "playhead" | null;

/** Playback transport with play state and precise current/duration readouts. */
function TimeStampControl() {
  const playheadTime = useAppSelector((state) => state.editor.playHeadTime);
  const isPaused = useAppSelector((state) => state.editor.isPaused);
  const timelineDuration = useAppSelector(
    (state) => state.editor.projectInfo.durationSeconds ?? TIMELINE_DURATION,
  );
  const dispatch = useAppDispatch();

  const frameRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeField, setActiveField] = useState<EditableField>(null);
  const [draftTime, setDraftTime] = useState(formatPreciseTimelineTime(playheadTime));
  const [draftDuration, setDraftDuration] = useState(formatPreciseTimelineTime(timelineDuration));

  useEffect(() => {
    if (activeField !== "playhead") {
      setDraftTime(formatPreciseTimelineTime(playheadTime));
    }
  }, [activeField, playheadTime]);

  useEffect(() => {
    if (activeField !== "duration") {
      setDraftDuration(formatPreciseTimelineTime(timelineDuration));
    }
  }, [activeField, timelineDuration]);

  useEffect(() => {
    if (playheadTime <= timelineDuration) return;
    dispatch(setPlayHeadTime(Number(timelineDuration.toFixed(3))));
  }, [dispatch, playheadTime, timelineDuration]);

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
        rawNextTime >= timelineDuration ? rawNextTime % timelineDuration : rawNextTime;

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
  }, [dispatch, isPaused, timelineDuration]);

  useEffect(() => {
    if (!activeField) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [activeField]);

  /** Parses typed transport input and applies it to the active field when valid. */
  const commitDraftValue = () => {
    if (!activeField) return;
    const draftValue = activeField === "playhead" ? draftTime : draftDuration;
    const parsed = Number(draftValue.trim().replace(/s$/i, ""));
    if (!Number.isFinite(parsed)) {
      if (activeField === "playhead") {
        setDraftTime(formatPreciseTimelineTime(playheadTime));
      } else {
        setDraftDuration(formatPreciseTimelineTime(timelineDuration));
      }
      setActiveField(null);
      return;
    }

    if (activeField === "playhead") {
      const nextTime = Math.min(timelineDuration, Math.max(0, parsed));
      dispatch(setPlayHeadTime(Number(nextTime.toFixed(3))));
      setDraftTime(formatPreciseTimelineTime(nextTime));
    } else {
      const nextDuration = Math.max(0.1, parsed);
      dispatch(setProjectInfo({ durationSeconds: Number(nextDuration.toFixed(3)) }));
      setDraftDuration(formatPreciseTimelineTime(nextDuration));
    }
    setActiveField(null);
  };

  /** Cancels the active inline edit and restores the visible formatted value. */
  const cancelDraftValue = () => {
    setDraftTime(formatPreciseTimelineTime(playheadTime));
    setDraftDuration(formatPreciseTimelineTime(timelineDuration));
    setActiveField(null);
  };

  const renderEditableTime = (field: Exclude<EditableField, null>) => {
    const isEditing = activeField === field;
    const value = field === "playhead" ? draftTime : draftDuration;
    const displayValue =
      field === "playhead"
        ? formatPreciseTimelineTime(playheadTime)
        : formatPreciseTimelineTime(timelineDuration, true);

    if (!isEditing) {
      return (
        <button
          type="button"
          onClick={() => {
            setActiveField(field);
          }}
          className="rounded-[4px] border border-transparent px-1 font-[var(--wise-font-mono)] text-[12px] tabular-nums text-slate-100 transition hover:border-white/10 hover:bg-white/6"
          aria-label={field === "playhead" ? "Edit current timeline time" : "Edit timeline duration"}
        >
          {displayValue}
        </button>
      );
    }

    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => {
          if (field === "playhead") {
            setDraftTime(event.target.value);
          } else {
            setDraftDuration(event.target.value);
          }
        }}
        onBlur={commitDraftValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraftValue();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelDraftValue();
          }
        }}
        className="w-[4.5rem] rounded-[4px] border border-[rgba(141,171,255,0.24)] bg-white/6 px-1 font-[var(--wise-font-mono)] text-[12px] tabular-nums text-slate-100 outline-none"
        aria-label={field === "playhead" ? "Edit current timeline time" : "Edit timeline duration"}
      />
    );
  };

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

      <div className="flex items-center gap-1.5 font-[var(--wise-font-ui)] text-sm text-slate-100">
        {renderEditableTime("playhead")}
        <span className="text-slate-400">/</span>
        {renderEditableTime("duration")}
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
