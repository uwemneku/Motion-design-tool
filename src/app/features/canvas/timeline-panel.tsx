import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
} from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState } from "../../store";
import type { AppDispatch } from "../../store";
import {
  setIsPaused,
  setPlayheadTime,
} from "../../store/editor-slice";
import TimelineItemRow from "./timeline-item-row";
import TimelinePlayhead from "./timeline-playhead";

const TRACK_MIN_WIDTH = 1200;
const LABEL_COLUMN_WIDTH = 180;
const KEYFRAME_SECTION_HORIZONTAL_PADDING = 12; // Tailwind px-3
const TIMELINE_DURATION = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function TimelinePanel() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const canvasItemIds = useSelector(
    (state: RootState) => state.editor.canvasItemIds,
  );
  const isPaused = useSelector((state: RootState) => state.editor.isPaused);
  const frameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const playheadRef = useRef(store.getState().editor.playheadTime);

  useEffect(() => {
    const updatePlayhead = () => {
      playheadRef.current = store.getState().editor.playheadTime;
    };

    updatePlayhead();
    const unsubscribe = store.subscribe(updatePlayhead);
    return unsubscribe;
  }, [store]);

  const seekFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp(event.clientX - bounds.left, 0, bounds.width);
    const nextTime = (x / bounds.width) * TIMELINE_DURATION;
    dispatch(setPlayheadTime(Number(nextTime.toFixed(3))));
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.code !== "Space") return;
    event.preventDefault();
    dispatch(setIsPaused(!isPaused));
  };

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
      dispatch(setPlayheadTime(Number(nextTime.toFixed(3))));

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
    <section
      className="shrink-0 border-t border-slate-200 bg-white"
      data-testid="timeline"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="h-40 overflow-auto">
        <div
          className="relative min-w-[1200px]"
          style={{ minWidth: TRACK_MIN_WIDTH }}
        >
          <TimelinePlayhead
            duration={TIMELINE_DURATION}
            keyframeSectionOffset={LABEL_COLUMN_WIDTH + KEYFRAME_SECTION_HORIZONTAL_PADDING}
            keyframeSectionRightOffset={KEYFRAME_SECTION_HORIZONTAL_PADDING}
          />

          <div className="sticky top-0 z-20 grid grid-cols-[180px_1fr] border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <div className="sticky left-0 z-30 border-r border-slate-200 bg-slate-50 px-3 py-2">
              Item
            </div>
            <div
              className="relative cursor-pointer px-3 py-2"
              onClick={seekFromPointer}
              title="Click to move playhead"
            >
              Timeline
            </div>
          </div>

          {canvasItemIds.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">No items yet</div>
          ) : (
            canvasItemIds.map((id) => (
              <TimelineItemRow
                key={id}
                id={id}
                onSeekFromPointer={seekFromPointer}
                timelineDuration={TIMELINE_DURATION}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
