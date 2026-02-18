import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Resizable } from "re-resizable";
import { useDispatch, useSelector, useStore } from "react-redux";
import { AppScrollArea } from "../../../components/app-scroll-area";
import {
  KEYFRAME_SECTION_HORIZONTAL_PADDING,
  LABEL_COLUMN_WIDTH,
  TIMELINE_DEFAULT_HEIGHT,
  TIMELINE_DURATION,
  TIMELINE_LABEL_STEP,
  TIMELINE_MAX_HEIGHT,
  TIMELINE_MIN_HEIGHT,
  TRACK_MIN_WIDTH,
} from "../../../../const";
import TimelineItemRow from "./timeline-item-row";
import TimelinePlayhead from "./timeline-playhead";
import type { AppDispatch, RootState } from "../../../store";
import { setIsPaused, setPlayheadTime } from "../../../store/editor-slice";

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
  const [timelineHeight, setTimelineHeight] = useState(TIMELINE_DEFAULT_HEIGHT);

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
      className="shrink-0 border-t border-[var(--wise-border)] bg-[var(--wise-surface)] focus-visible:outline-none"
      data-testid="timeline"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <Resizable
        size={{ width: "100%", height: timelineHeight }}
        minHeight={TIMELINE_MIN_HEIGHT}
        maxHeight={TIMELINE_MAX_HEIGHT}
        enable={{
          top: true,
          right: false,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        handleClasses={{
          top: "h-2 -top-1 cursor-row-resize bg-transparent hover:bg-[var(--wise-focus)]",
        }}
        onResizeStop={(_, __, ___, delta) => {
          setTimelineHeight((prev) =>
            clamp(
              prev + delta.height,
              TIMELINE_MIN_HEIGHT,
              TIMELINE_MAX_HEIGHT,
            ),
          );
        }}
      >
        <AppScrollArea
          rootClassName="h-full overflow-hidden"
          viewportClassName="h-full w-full"
          showHorizontalScrollbar
          showCorner
          horizontalScrollbarClassName="flex h-2.5 touch-none select-none border-t border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-0.5"
          verticalScrollbarClassName="flex w-2.5 touch-none select-none border-l border-[var(--wise-border)] bg-[var(--wise-surface-raised)] p-0.5"
          cornerClassName="bg-[var(--wise-surface-raised)]"
        >
          <div className="h-full w-full">
            <div
              className="relative min-w-[1200px]"
              style={{ minWidth: TRACK_MIN_WIDTH }}
            >
              <TimelinePlayhead
                duration={TIMELINE_DURATION}
                keyframeSectionOffset={
                  LABEL_COLUMN_WIDTH + KEYFRAME_SECTION_HORIZONTAL_PADDING
                }
                keyframeSectionRightOffset={KEYFRAME_SECTION_HORIZONTAL_PADDING}
              />

              <div className="sticky top-0 z-20 grid grid-cols-[180px_1fr] border-b border-[var(--wise-border)] bg-[var(--wise-surface-raised)] text-xs font-medium text-slate-200">
                <div className="sticky left-0 z-30 border-r border-[var(--wise-border)] bg-[var(--wise-surface-raised)] px-3 py-2">
                  Item
                </div>
                <div
                  className="relative cursor-pointer px-3 py-2"
                  onClick={seekFromPointer}
                  title="Click to move playhead"
                >
                  <div className="relative h-4">
                    {Array.from(
                      {
                        length:
                          Math.floor(TIMELINE_DURATION / TIMELINE_LABEL_STEP) +
                          1,
                      },
                      (_, index) => {
                        const time = index * TIMELINE_LABEL_STEP;
                        const left = clamp(
                          (time / TIMELINE_DURATION) * 100,
                          0,
                          100,
                        );
                        return (
                          <div
                            key={`timeline-label-${time}`}
                            className="pointer-events-none absolute top-0 -translate-x-1/2"
                            style={{ left: `${left}%` }}
                          >
                            <div className="mx-auto h-1.5 w-px bg-slate-500" />
                            <div className="pt-0.5 text-[10px] font-medium text-slate-400">
                              {formatTimelineLabel(time)}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>

              {canvasItemIds.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-500">
                  No items yet
                </div>
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
        </AppScrollArea>
      </Resizable>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTimelineLabel(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
