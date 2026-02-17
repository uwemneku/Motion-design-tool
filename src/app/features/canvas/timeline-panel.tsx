import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Resizable } from "re-resizable";
import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState } from "../../store";
import type { AppDispatch } from "../../store";
import { setIsPaused, setPlayheadTime } from "../../store/editor-slice";
import TimelineItemRow from "./timeline-item-row";
import TimelinePlayhead from "./timeline-playhead";

const TRACK_MIN_WIDTH = 1200;
const LABEL_COLUMN_WIDTH = 180;
const KEYFRAME_SECTION_HORIZONTAL_PADDING = 12; // Tailwind px-3
const TIMELINE_DURATION = 10;
const TIMELINE_MIN_HEIGHT = 120;
const TIMELINE_MAX_HEIGHT = 420;
const TIMELINE_DEFAULT_HEIGHT = 160;

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
      className="shrink-0 border-t border-slate-700 bg-slate-900 focus-visible:outline-none"
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
          top: "h-2 -top-1 cursor-row-resize bg-transparent hover:bg-sky-500/20",
        }}
        onResizeStop={(_, __, ___, delta) => {
          setTimelineHeight((prev) =>
            clamp(prev + delta.height, TIMELINE_MIN_HEIGHT, TIMELINE_MAX_HEIGHT),
          );
        }}
      >
        <ScrollArea.Root className="h-full overflow-hidden">
          <ScrollArea.Viewport className="h-full w-full">
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

              <div className="sticky top-0 z-20 grid grid-cols-[180px_1fr] border-b border-slate-700 bg-slate-900 text-xs font-medium text-slate-300">
                <div className="sticky left-0 z-30 border-r border-slate-700 bg-slate-900 px-3 py-2">
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
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            className="flex h-2.5 touch-none select-none border-t border-slate-800 bg-slate-950 p-0.5"
            orientation="horizontal"
          >
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-700" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar
            className="flex w-2.5 touch-none select-none border-l border-slate-800 bg-slate-950 p-0.5"
            orientation="vertical"
          >
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-700" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Corner className="bg-slate-950" />
        </ScrollArea.Root>
      </Resizable>
    </section>
  );
}
